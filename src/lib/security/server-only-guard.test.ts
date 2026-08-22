import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");

const SERVER_ONLY_MODULES = [
  "src/lib/security/secrets.ts",
  "src/lib/security/signed-state.ts",
  "src/lib/security/rate-limit.ts",
  "src/lib/security/rate-limit-core.ts",
  "src/lib/supabase/admin.ts",
  "src/lib/auth-security-server.ts",
  "src/lib/security/turnstile.ts",
  "src/lib/security/image-process.ts",
];

describe("server-only secret modules", () => {
  it("declare import \"server-only\" so client bundles cannot include them", () => {
    for (const relative of SERVER_ONLY_MODULES) {
      const source = readFileSync(path.join(ROOT, relative), "utf8");
      assert.match(source, /import ["']server-only["']/, relative);
    }
  });

  it("server-only throws outside the react-server condition", () => {
    const result = spawnSync(process.execPath, ["-e", "require('server-only')"], {
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stderr}${result.stdout}`, /server-only|Client Component/i);
  });
});
