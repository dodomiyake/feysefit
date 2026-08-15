import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildContentSecurityPolicy, securityHeaders } from "./headers";

describe("security headers", () => {
  it("builds a nonce CSP without unsafe-eval or unrestricted script unsafe-inline", () => {
    const csp = buildContentSecurityPolicy("test-nonce");
    assert.match(csp, /script-src 'self' 'nonce-test-nonce' 'strict-dynamic'/);
    const script = csp
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("script-src"));
    assert.ok(script);
    assert.equal(script.includes("unsafe-eval"), false);
    assert.equal(script.includes("unsafe-inline"), false);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /base-uri 'self'/);
    assert.match(csp, /form-action 'self'/);
  });

  it("includes nosniff, referrer, and permissions policy", () => {
    const keys = securityHeaders("n").map((header) => header.key);
    assert.ok(keys.includes("X-Content-Type-Options"));
    assert.ok(keys.includes("Referrer-Policy"));
    assert.ok(keys.includes("Permissions-Policy"));
    assert.ok(keys.includes("Content-Security-Policy"));
  });
});
