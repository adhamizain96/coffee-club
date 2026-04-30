// Lightweight HMAC-signed cookie + constant-time password compare for the
// single-curator admin gate. No external auth lib.
//
// The cookie value is `<expiryMs>.<base64urlSig>` where `sig` is
// HMAC-SHA256(ADMIN_PASSWORD, expiryMs). Verification re-derives the sig and
// uses `crypto.timingSafeEqual` to avoid leaking the secret via response time.
//
// All exported functions return false (rather than throw) when ADMIN_PASSWORD
// is unset, so the proxy fails closed cleanly instead of 500'ing.

import crypto from "node:crypto";

export const ADMIN_COOKIE_NAME = "coffee_club_admin";

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const ADMIN_COOKIE_MAX_AGE_SEC = Math.floor(MAX_AGE_MS / 1000);

function getSecret(): string | null {
  const value = process.env.ADMIN_PASSWORD;
  return value && value.length > 0 ? value : null;
}

function sign(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

export function signCookieValue(): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const payload = String(Date.now() + MAX_AGE_MS);
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyCookieValue(value: string | undefined): boolean {
  if (!value) return false;
  const secret = getSecret();
  if (!secret) return false;

  const dotIdx = value.indexOf(".");
  if (dotIdx <= 0 || dotIdx === value.length - 1) return false;

  const payload = value.slice(0, dotIdx);
  const providedSig = value.slice(dotIdx + 1);

  const expiry = Number(payload);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) return false;

  const expectedSig = sign(payload, secret);

  let providedBuf: Buffer;
  let expectedBuf: Buffer;
  try {
    providedBuf = Buffer.from(providedSig, "base64url");
    expectedBuf = Buffer.from(expectedSig, "base64url");
  } catch {
    return false;
  }
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export function constantTimePasswordMatch(input: string): boolean {
  const secret = getSecret();
  if (!secret) return false;

  const inputBuf = Buffer.from(input);
  const secretBuf = Buffer.from(secret);

  // timingSafeEqual requires equal-length buffers. Compare against the input
  // itself in the wrong-length branch so the timing of the wrong-length case
  // is similar to the wrong-content case.
  if (inputBuf.length !== secretBuf.length) {
    crypto.timingSafeEqual(inputBuf, inputBuf);
    return false;
  }
  return crypto.timingSafeEqual(inputBuf, secretBuf);
}
