import { NextResponse } from "next/server";

export function jsonData<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  console.error(error);
  if (error instanceof Error) {
    return jsonError(error.message, 400);
  }
  return jsonError("Internal server error", 500);
}
