import "server-only";

import { issueSignedState, verifySignedState } from "@/lib/security/signed-state";
import type { SessionBinding } from "@/lib/security/session-binding";
import {
  getAbsoluteSessionMs,
  IDLE_TIMEOUT_MS,
  REAUTH_MAX_AGE_MS,
  type ReauthValidity,
  type SessionValidity,
} from "@/lib/auth-security";

export async function evaluateRecentReauth(input: {
  reauthRaw: string | undefined;
  binding: SessionBinding;
  nowMs?: number;
}): Promise<ReauthValidity> {
  const verified = await verifySignedState({
    token: input.reauthRaw,
    purpose: "reauth",
    userId: input.binding.userId,
    sessionId: input.binding.sessionId,
    nowMs: input.nowMs,
  });
  if (!verified.ok) {
    if (verified.reason === "expired") return { ok: false, reason: "expired" };
    if (verified.reason === "malformed" || verified.reason === "missing_claims") {
      return { ok: false, reason: "missing" };
    }
    return { ok: false, reason: "invalid" };
  }
  return {
    ok: true,
    reauthenticatedAt: verified.claims.iat,
    expiresAt: verified.claims.exp,
  };
}

export async function issueReauthCookieValue(input: {
  binding: SessionBinding;
  nowMs?: number;
}): Promise<string | null> {
  const now = input.nowMs ?? Date.now();
  return issueSignedState({
    purpose: "reauth",
    userId: input.binding.userId,
    sessionId: input.binding.sessionId,
    issuedAtMs: now,
    expiresAtMs: now + REAUTH_MAX_AGE_MS,
  });
}

export async function issueSessionClockCookieValues(input: {
  binding: SessionBinding;
  remember: boolean;
  startedAtMs: number;
  lastActivityAtMs: number;
}): Promise<{ started: string; lastActivity: string } | null> {
  const absoluteExp = input.startedAtMs + getAbsoluteSessionMs(input.remember);
  const idleExp = input.lastActivityAtMs + IDLE_TIMEOUT_MS;
  const started = await issueSignedState({
    purpose: "session_started",
    userId: input.binding.userId,
    sessionId: input.binding.sessionId,
    issuedAtMs: input.startedAtMs,
    expiresAtMs: absoluteExp,
  });
  const lastActivity = await issueSignedState({
    purpose: "last_activity",
    userId: input.binding.userId,
    sessionId: input.binding.sessionId,
    issuedAtMs: input.lastActivityAtMs,
    expiresAtMs: Math.min(idleExp, absoluteExp),
  });
  if (!started || !lastActivity) return null;
  return { started, lastActivity };
}

export async function evaluateSessionClocks(input: {
  nowMs?: number;
  rememberRaw: string | undefined;
  startedRaw: string | undefined;
  lastActivityRaw: string | undefined;
  binding: SessionBinding;
}): Promise<SessionValidity> {
  const now = input.nowMs ?? Date.now();
  const remember = input.rememberRaw === "1";

  const started = await verifySignedState({
    token: input.startedRaw,
    purpose: "session_started",
    userId: input.binding.userId,
    sessionId: input.binding.sessionId,
    nowMs: now,
  });
  const lastActivity = await verifySignedState({
    token: input.lastActivityRaw,
    purpose: "last_activity",
    userId: input.binding.userId,
    sessionId: input.binding.sessionId,
    nowMs: now,
  });

  if (!started.ok || !lastActivity.ok) {
    if (!started.ok && started.reason === "expired") {
      return { ok: false, reason: "absolute" };
    }
    if (!lastActivity.ok && lastActivity.reason === "expired") {
      return { ok: false, reason: "idle" };
    }
    return { ok: false, reason: "invalid" };
  }

  if (now - lastActivity.claims.iat > IDLE_TIMEOUT_MS) {
    return { ok: false, reason: "idle" };
  }
  if (now - started.claims.iat > getAbsoluteSessionMs(remember)) {
    return { ok: false, reason: "absolute" };
  }
  return {
    ok: true,
    remember,
    startedAt: started.claims.iat,
    lastActivityAt: lastActivity.claims.iat,
  };
}
