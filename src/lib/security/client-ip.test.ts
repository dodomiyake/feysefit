import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientIpFromHeaders } from "./client-ip";

function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    const next = values[key];
    if (next === undefined) delete process.env[key];
    else process.env[key] = next;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe("trusted proxy IP boundary", () => {
  it("ignores spoofed x-forwarded-for when no proxy setting is present", () => {
    withEnv({ TRUSTED_PROXY: undefined, VERCEL: undefined, TRUST_CLOUDFLARE: undefined }, () => {
      const headers = new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" });
      assert.equal(clientIpFromHeaders(headers), "unknown");
    });
  });

  it("ignores spoofed cf-connecting-ip unless TRUST_CLOUDFLARE=1", () => {
    withEnv({ TRUSTED_PROXY: undefined, VERCEL: undefined, TRUST_CLOUDFLARE: undefined }, () => {
      const headers = new Headers({ "cf-connecting-ip": "198.51.100.8" });
      assert.equal(clientIpFromHeaders(headers), "unknown");
    });
  });

  it("uses cf-connecting-ip only when TRUST_CLOUDFLARE=1", () => {
    withEnv({ TRUST_CLOUDFLARE: "1", VERCEL: undefined, TRUSTED_PROXY: undefined }, () => {
      const headers = new Headers({
        "x-forwarded-for": "203.0.113.9",
        "cf-connecting-ip": "198.51.100.8",
      });
      assert.equal(clientIpFromHeaders(headers), "198.51.100.8");
    });
  });

  it("uses the last x-forwarded-for hop behind TRUSTED_PROXY", () => {
    withEnv({ TRUSTED_PROXY: "1", VERCEL: undefined, TRUST_CLOUDFLARE: undefined }, () => {
      const headers = new Headers({ "x-forwarded-for": "203.0.113.9, 198.51.100.2" });
      assert.equal(clientIpFromHeaders(headers), "198.51.100.2");
    });
  });

  it("on Vercel prefers platform headers over spoofed x-forwarded-for", () => {
    withEnv({ VERCEL: "1", TRUSTED_PROXY: undefined, TRUST_CLOUDFLARE: undefined }, () => {
      const headers = new Headers({
        "x-forwarded-for": "203.0.113.9",
        "x-vercel-forwarded-for": "198.51.100.44",
      });
      assert.equal(clientIpFromHeaders(headers), "198.51.100.44");
    });
  });
});
