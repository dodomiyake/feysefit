export function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase();
}

export function buildInviteSignupUrl(code: string, origin?: string) {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const params = new URLSearchParams({
    role: "customer",
    invite: normalizeInviteCode(code),
  });
  return `${base}/signup?${params.toString()}`;
}

export function buildInviteJoinUrl(code: string, origin?: string) {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/join/${encodeURIComponent(normalizeInviteCode(code))}`;
}
