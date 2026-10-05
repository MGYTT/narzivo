import { createHash } from "node:crypto";

export function privacyHash(value: string | null | undefined) {
  if (!value) return null;
  const salt = process.env.CLICK_HASH_SALT;
  if (!salt || salt.length < 32) return null;
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function safeExternalUrl(value: string) {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Nieprawidłowy protokół URL");
  return url.toString();
}
