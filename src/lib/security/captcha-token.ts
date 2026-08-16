export type OneTimeTokenSlot = { current: string | null };

export function storeOneTimeToken(slot: OneTimeTokenSlot, value: string | null | undefined) {
  const token = value?.trim() || null;
  slot.current = token;
  return token;
}

/**
 * Atomically removes a CAPTCHA token from client state for one request.
 * Resetting the provider widget is deliberately the caller's responsibility
 * after that request settles; resetting before verification can invalidate it.
 */
export function takeOneTimeToken(slot: OneTimeTokenSlot) {
  const token = slot.current?.trim() || null;
  slot.current = null;
  return token;
}
