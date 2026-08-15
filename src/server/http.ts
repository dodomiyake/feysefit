import { NextResponse } from "next/server";
import { redactForLogs } from "@/lib/security/redact";
import {
  RATE_LIMITED_CODE,
  RATE_LIMITED_MESSAGE,
  RATE_LIMIT_UNAVAILABLE_CODE,
  RATE_LIMIT_UNAVAILABLE_MESSAGE,
  SensitiveRateLimitError,
  type DeniedDurableRateLimitDecision,
} from "@/lib/security/rate-limit-core";

export { redactForLogs };

export const PUBLIC_INTERNAL_ERROR = "Something went wrong. Please try again.";
export const PUBLIC_INTERNAL_ERROR_CODE = "internal_error";

export function rateLimitHttpResponse(decision: DeniedDurableRateLimitDecision) {
  if (decision.kind === "limited") {
    return NextResponse.json(
      { error: RATE_LIMITED_MESSAGE, code: RATE_LIMITED_CODE },
      { status: 429 }
    );
  }
  return NextResponse.json(
    {
      error: RATE_LIMIT_UNAVAILABLE_MESSAGE,
      code: RATE_LIMIT_UNAVAILABLE_CODE,
      requestId: decision.requestId,
    },
    { status: 503 }
  );
}

export function jsonData<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json(
    {
      error: message,
      code: code ?? (status === 401 ? "unauthorized" : status === 403 ? "forbidden" : status === 404 ? "not_found" : "request_error"),
    },
    { status }
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof SensitiveRateLimitError) {
    return rateLimitHttpResponse(error.decision);
  }

  const requestId = crypto.randomUUID();
  const raw = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify({
      type: "api_error",
      requestId,
      message: redactForLogs(raw),
    })
  );

  return NextResponse.json(
    {
      error: PUBLIC_INTERNAL_ERROR,
      code: PUBLIC_INTERNAL_ERROR_CODE,
      requestId,
    },
    { status: 500 }
  );
}
