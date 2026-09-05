"use strict";

/**
 * Minimal authenticated HTTP front for a local clamd, speaking clamd's
 * native INSTREAM protocol over a plain TCP socket. No dependencies.
 *
 * clamd itself is never exposed outside this container — only this proxy's
 * HTTP port is published. See README.md for the deployment model and why
 * that split exists.
 *
 * Env:
 *   SCAN_PROXY_TOKEN   required. Bearer token callers must present.
 *   PORT               default 8080. HTTP port this proxy listens on.
 *   CLAMD_HOST         default 127.0.0.1. Only change if clamd runs elsewhere
 *                      on a network you trust — the wire protocol has no auth.
 *   CLAMD_PORT         default 3310.
 *   MAX_BODY_BYTES     default 26214400 (25 MiB). Reject larger uploads
 *                      before touching clamd.
 */

const http = require("node:http");
const net = require("node:net");
const crypto = require("node:crypto");

const TOKEN = process.env.SCAN_PROXY_TOKEN;
if (!TOKEN || TOKEN.trim().length < 16) {
  console.error("SCAN_PROXY_TOKEN must be set to a random value of at least 16 characters. Exiting.");
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 8080;
const CLAMD_HOST = process.env.CLAMD_HOST || "127.0.0.1";
const CLAMD_PORT = Number(process.env.CLAMD_PORT) || 3310;
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES) || 25 * 1024 * 1024;
const CLAMD_TIMEOUT_MS = 20_000;
const CHUNK_SIZE = 65536;

function timingSafeTokenMatch(provided) {
  const a = Buffer.from(provided || "", "utf8");
  const b = Buffer.from(TOKEN, "utf8");
  if (a.length !== b.length) {
    // Still run a comparison of equal length to avoid a length-based timing signal.
    crypto.timingSafeEqual(Buffer.alloc(b.length), Buffer.alloc(b.length));
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("payload_too_large"), { code: "payload_too_large" }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Speaks clamd's INSTREAM protocol. Resolves { clean, signature }. */
function scanWithClamd(buffer) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: CLAMD_HOST, port: CLAMD_PORT });
    let responseBuf = Buffer.alloc(0);
    let settled = false;

    const finish = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      fn();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error("clamd_timeout")));
    }, CLAMD_TIMEOUT_MS);

    socket.on("error", (err) => finish(() => reject(err)));

    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      let offset = 0;
      while (offset < buffer.length) {
        const end = Math.min(offset + CHUNK_SIZE, buffer.length);
        const chunk = buffer.subarray(offset, end);
        const sizeHeader = Buffer.alloc(4);
        sizeHeader.writeUInt32BE(chunk.length, 0);
        socket.write(sizeHeader);
        socket.write(chunk);
        offset = end;
      }
      // Zero-length chunk terminates the stream.
      const zero = Buffer.alloc(4);
      socket.write(zero);
    });

    socket.on("data", (data) => {
      responseBuf = Buffer.concat([responseBuf, data]);
    });

    socket.on("close", () => {
      finish(() => {
        const text = responseBuf.toString("utf8").replace(/\0/g, "").trim();
        if (!text) {
          reject(new Error("empty_clamd_response"));
          return;
        }
        if (text.includes("FOUND")) {
          const match = text.match(/stream:\s*(.+?)\s*FOUND/);
          resolve({ clean: false, signature: match ? match[1] : "unknown" });
          return;
        }
        if (text.includes("OK")) {
          resolve({ clean: true, signature: null });
          return;
        }
        reject(new Error(`unexpected_clamd_response: ${text}`));
      });
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.method !== "POST" || req.url !== "/scan") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  const auth = req.headers.authorization || "";
  const provided = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!provided || !timingSafeTokenMatch(provided)) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  readBody(req)
    .then(async (buffer) => {
      if (buffer.length === 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "empty_body" }));
        return;
      }
      try {
        const result = await scanWithClamd(buffer);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("scan_failed", err instanceof Error ? err.message : err);
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "scan_unavailable" }));
      }
    })
    .catch((err) => {
      if (err && err.code === "payload_too_large") {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "payload_too_large" }));
        return;
      }
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid_body" }));
    });
});

server.listen(PORT, () => {
  console.log(`clamav-proxy listening on :${PORT}, forwarding to clamd at ${CLAMD_HOST}:${CLAMD_PORT}`);
});
