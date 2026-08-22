import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { processPublicImage, UploadValidationError } from "@/lib/security/image-process";
import { runSensitiveHttpAction } from "@/lib/security/rate-limit";
import { STORAGE_BUCKETS, MAX_STORAGE_IMAGE_BYTES, type StorageBucket } from "@/lib/storage/buckets";
import { buildOwnedObjectPath } from "@/lib/storage/storage-url";
import { redactForLogs } from "@/lib/security/redact";

const PUBLIC_IMAGE_BUCKETS = new Set<string>([
  STORAGE_BUCKETS.avatars,
  STORAGE_BUCKETS.designerPortfolios,
]);

const PRIVATE_IMAGE_BUCKETS = new Set<string>([
  STORAGE_BUCKETS.projectReferences,
  STORAGE_BUCKETS.projectProgress,
  STORAGE_BUCKETS.customerInspiration,
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isImageBucket(value: string): value is StorageBucket {
  return PUBLIC_IMAGE_BUCKETS.has(value) || PRIVATE_IMAGE_BUCKETS.has(value);
}

/**
 * POST /auth/uploads/promote
 * Trusted upload boundary: magic-byte check, decode/re-encode, then service-role
 * write. Direct Storage uploads to public image buckets are revoked in SQL.
 * This is not malware scanning.
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: "unavailable", requestId }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const bucket = typeof form.get("bucket") === "string" ? String(form.get("bucket")).trim() : "";
  const prefix = typeof form.get("prefix") === "string" ? String(form.get("prefix")).trim() : "image";
  const projectIdRaw =
    typeof form.get("projectId") === "string" ? String(form.get("projectId")).trim() : "";
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  if (!isImageBucket(bucket)) {
    return NextResponse.json({ ok: false, error: "invalid_bucket" }, { status: 400 });
  }
  if (!/^[a-z0-9-]{1,40}$/i.test(prefix)) {
    return NextResponse.json({ ok: false, error: "invalid_prefix" }, { status: 400 });
  }
  if (file.size > MAX_STORAGE_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 400 });
  }

  const projectId = UUID_RE.test(projectIdRaw) ? projectIdRaw : "";
  if (PRIVATE_IMAGE_BUCKETS.has(bucket) && !projectId) {
    return NextResponse.json({ ok: false, error: "project_required" }, { status: 400 });
  }

  if (PRIVATE_IMAGE_BUCKETS.has(bucket) && projectId) {
    const { data: project, error } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();
    if (error || !project) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
  }

  const gated = await runSensitiveHttpAction("designRequest", user.id, async () => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let processed;
    try {
      processed = await processPublicImage(bytes);
    } catch (error) {
      if (error instanceof UploadValidationError) {
        return { ok: false as const, status: 400 as const, error: error.code };
      }
      throw error;
    }
    const fileName = `${prefix}-${crypto.randomUUID()}.${processed.extension}`;
    const path = buildOwnedObjectPath(user.id, fileName, projectId || null);
    const admin = createServiceClient();
    const { error } = await admin.storage.from(bucket).upload(path, processed.bytes, {
      upsert: false,
      contentType: processed.mime,
      cacheControl: "3600",
    });
    if (error) {
      console.error(
        JSON.stringify({
          type: "upload_promote_failed",
          requestId,
          message: redactForLogs(error.message),
        })
      );
      throw new Error("upload_failed");
    }
    const { data } = admin.storage.from(bucket).getPublicUrl(path);
    return { ok: true as const, path, url: data.publicUrl };
  });

  if (!gated.ok) return gated.response;
  if (!gated.value.ok) {
    return NextResponse.json({ ok: false, error: gated.value.error }, { status: gated.value.status });
  }

  return NextResponse.json({
    ok: true,
    bucket,
    path: gated.value.path,
    url: gated.value.url,
  });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}
