import { afterEach, describe, expect, it, vi } from "vitest";
import { getBackendMode, isDemoAuthAllowed } from "./backend";

const BACKEND_KEYS = [
  "NEXT_PUBLIC_USE_SUPABASE",
  "NEXT_PUBLIC_USE_API",
  "NEXT_PUBLIC_ENABLE_DEMO_MODE",
] as const;

function clearBackendEnvironment() {
  for (const key of BACKEND_KEYS) {
    vi.stubEnv(key, "");
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getBackendMode", () => {
  it("selects Supabase when it is the only enabled backend", () => {
    clearBackendEnvironment();
    vi.stubEnv("NEXT_PUBLIC_USE_SUPABASE", "true");

    expect(getBackendMode()).toBe("supabase");
  });

  it("rejects a missing backend configuration", () => {
    clearBackendEnvironment();

    expect(() => getBackendMode()).toThrow(/not configured/i);
  });

  it("rejects multiple enabled backends", () => {
    clearBackendEnvironment();
    vi.stubEnv("NEXT_PUBLIC_USE_SUPABASE", "true");
    vi.stubEnv("NEXT_PUBLIC_USE_API", "true");

    expect(() => getBackendMode()).toThrow(/ambiguous/i);
  });

  it("rejects demo mode in production", () => {
    clearBackendEnvironment();
    vi.stubEnv("NEXT_PUBLIC_ENABLE_DEMO_MODE", "true");
    vi.stubEnv("NODE_ENV", "production");

    expect(() => getBackendMode()).toThrow(/disabled in production/i);
    expect(() => isDemoAuthAllowed()).toThrow(/disabled in production/i);
  });
});
