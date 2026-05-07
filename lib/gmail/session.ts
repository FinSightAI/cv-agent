import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

// Encrypts the Gmail refresh token in an httpOnly cookie. AES-256-GCM,
// keyed off SESSION_SECRET (32+ chars). Cookie value is base64url(iv | ct | tag).

const ALG = "aes-256-gcm";
const COOKIE_NAME = "cva_gmail";

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET ?? process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set and at least 16 chars");
  }
  // Derive a 32-byte key from the secret regardless of its length.
  return createHash("sha256").update(secret).digest();
}

export function encryptToCookieValue(plain: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("base64url");
}

export function decryptFromCookieValue(value: string): string | null {
  try {
    const buf = Buffer.from(value, "base64url");
    if (buf.length < 12 + 16) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(buf.length - 16);
    const ct = buf.subarray(12, buf.length - 16);
    const decipher = createDecipheriv(ALG, getKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
    return plain.toString("utf8");
  } catch {
    return null;
  }
}

export const GMAIL_COOKIE = COOKIE_NAME;
