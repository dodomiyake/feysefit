import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { shipLog } from "./log-shipper";

function okResponse(): Response {
  return new Response(null, { status: 202 });
}

describe("log shipper", () => {
  it("always logs locally, even when shipping is not configured", async () => {
    const spy = mock.method(console, "error", () => {});
    try {
      await shipLog({ type: "test_event" }, { token: null });
      assert.equal(spy.mock.callCount(), 1);
      const logged = JSON.parse(spy.mock.calls[0].arguments[0] as string);
      assert.equal(logged.type, "test_event");
    } finally {
      spy.mock.restore();
    }
  });

  it("uses console.warn / console.log for non-error levels", async () => {
    const warnSpy = mock.method(console, "warn", () => {});
    const logSpy = mock.method(console, "log", () => {});
    try {
      await shipLog({ type: "a", level: "warning" }, { token: null });
      await shipLog({ type: "b", level: "info" }, { token: null });
      assert.equal(warnSpy.mock.callCount(), 1);
      assert.equal(logSpy.mock.callCount(), 1);
    } finally {
      warnSpy.mock.restore();
      logSpy.mock.restore();
    }
  });

  it("does not call the network when no token is configured", async () => {
    let called = false;
    await shipLog(
      { type: "test_event" },
      { token: null, fetchImpl: async () => { called = true; return okResponse(); } }
    );
    assert.equal(called, false);
  });

  it("forwards to the configured endpoint with a bearer token when configured", async () => {
    let capturedUrl: string | null = null;
    let capturedAuth: string | null = null;
    await shipLog(
      { type: "test_event", count: 3 },
      {
        token: "shhh",
        url: "https://logs.example/ingest",
        fetchImpl: async (input, init) => {
          capturedUrl = String(input);
          capturedAuth = (init?.headers as Record<string, string>)?.Authorization ?? null;
          return okResponse();
        },
      }
    );
    assert.equal(capturedUrl, "https://logs.example/ingest");
    assert.equal(capturedAuth, "Bearer shhh");
  });

  it("never throws when the log drain is unreachable", async () => {
    await assert.doesNotReject(
      shipLog(
        { type: "test_event" },
        {
          token: "shhh",
          url: "https://logs.example/ingest",
          fetchImpl: async () => {
            throw new Error("ECONNREFUSED");
          },
        }
      )
    );
  });
});
