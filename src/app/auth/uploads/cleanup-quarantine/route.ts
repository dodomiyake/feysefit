import { createServiceClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { STORAGE_BUCKETS } from "@/lib/storage/buckets";
import { timingSafeEqual } from "@/lib/security/hmac";
import { redactForLogs } from "@/lib/security/redact";

const MAX_REMOVE = 500;
const MAX_FOLDERS = 100;
const AGE_MS = 24 * 60 * 60 * 1000;

function cronSecretAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  const header = request.headers.get("authorization")?.trim() ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const provided = bearer || request.headers.get("x-cron-secret")?.trim() || "";
  if (!provided) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(provided);
  const b = encoder.encode(expected);
  return timingSafeEqual(a, b);
}

/**
 * POST /auth/uploads/cleanup-quarantine
 * Removes abandoned quarantine objects through the Storage API (not SQL catalog-only).
 * Requires CRON_SECRET. Logs counts only — no filenames.
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ ok: false, error: "unavailable", requestId }, { status: 503 });
  }
  if (!cronSecretAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: "unavailable", requestId }, { status: 503 });
  }

  const cutoff = Date.now() - AGE_MS;
  const admin = createServiceClient();
  const bucket = STORAGE_BUCKETS.uploadsQuarantine;
  const expired: string[] = [];

  try {
    const root = await admin.storage.from(bucket).list("", { limit: MAX_FOLDERS, offset: 0 });
    if (root.error) throw root.error;

    for (const entry of root.data ?? []) {
      if (expired.length >= MAX_REMOVE) break;
      const created = entry.created_at ? Date.parse(entry.created_at) : NaN;
      if (entry.id && Number.isFinite(created) && created < cutoff) {
        expired.push(entry.name);
        continue;
      }
      if (entry.id) continue;
      const nested = await admin.storage.from(bucket).list(entry.name, { limit: 1000, offset: 0 });
      if (nested.error) throw nested.error;
      for (const file of nested.data ?? []) {
        if (expired.length >= MAX_REMOVE) break;
        const nestedCreated = file.created_at ? Date.parse(file.created_at) : NaN;
        if (Number.isFinite(nestedCreated) && nestedCreated < cutoff) {
          expired.push(`${entry.name}/${file.name}`);
        }
      }
    }

    if (expired.length === 0) {
      return NextResponse.json({ ok: true, removed: 0, requestId });
    }

    const { error } = await admin.storage.from(bucket).remove(expired);
    if (error) throw error;
    return NextResponse.json({ ok: true, removed: expired.length, requestId });
  } catch (error) {
    console.error(
      JSON.stringify({
        type: "quarantine_cleanup_failed",
        requestId,
        message: redactForLogs(error instanceof Error ? error.message : "unknown"),
      })
    );
    return NextResponse.json({ ok: false, error: "unavailable", requestId }, { status: 503 });
  }
}
