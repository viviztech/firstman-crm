import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const DEDICATED_PREFIX = "v1";
const DERIVED_PREFIX = "v2";

function dedicatedKey(): string {
  return process.env.HR_DATA_ENCRYPTION_KEY || env.HR_DATA_ENCRYPTION_KEY;
}

function derivedKey(secret: string): Buffer {
  return Buffer.from(
    hkdfSync("sha256", secret, "firstman-crm-hr-data", "employee-private-records-v2", 32),
  );
}

export function isHrEncryptionConfigured(): boolean {
  return Boolean(dedicatedKey() || env.BETTER_AUTH_SECRET);
}

function key(version: string): Buffer {
  if (version === DERIVED_PREFIX) {
    return derivedKey(env.BETTER_AUTH_SECRET);
  }
  if (version !== DEDICATED_PREFIX || !dedicatedKey()) {
    throw new Error("HR encryption key is not configured for this record.");
  }
  const decoded = Buffer.from(dedicatedKey(), "base64");
  if (decoded.length !== 32) throw new Error("HR encryption key must be 32 bytes.");
  return decoded;
}

/** AES-256-GCM with a fresh 96-bit nonce and record-specific authenticated context. */
export function encryptHrJson(value: unknown, context: string): string {
  const version = DERIVED_PREFIX;
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(version), nonce);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [
    version,
    nonce.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function hrCiphertextVersion(ciphertext: string): number {
  return ciphertext.startsWith(`${DERIVED_PREFIX}:`) ? 2 : 1;
}

export function decryptHrJson<T>(ciphertext: string, context: string): T {
  const [version, nonceText, tagText, contentText] = ciphertext.split(":");
  if (
    (version !== DEDICATED_PREFIX && version !== DERIVED_PREFIX) ||
    !nonceText ||
    !tagText ||
    !contentText
  ) {
    throw new Error("Unsupported HR encrypted record format.");
  }
  const nonce = Buffer.from(nonceText, "base64url");
  const tag = Buffer.from(tagText, "base64url");
  if (nonce.length !== 12 || tag.length !== 16) {
    throw new Error("Invalid HR encrypted record format.");
  }
  const keys =
    version === DERIVED_PREFIX
      ? [
          derivedKey(env.BETTER_AUTH_SECRET),
          ...(process.env.HR_DATA_PREVIOUS_AUTH_SECRET || env.HR_DATA_PREVIOUS_AUTH_SECRET
            ? [
                derivedKey(
                  process.env.HR_DATA_PREVIOUS_AUTH_SECRET || env.HR_DATA_PREVIOUS_AUTH_SECRET,
                ),
              ]
            : []),
        ]
      : [key(version)];
  for (const candidate of keys) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", candidate, nonce);
      decipher.setAAD(Buffer.from(context, "utf8"));
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(contentText, "base64url")),
        decipher.final(),
      ]);
      return JSON.parse(plaintext.toString("utf8")) as T;
    } catch {
      // Try the temporary previous secret, if configured.
    }
  }
  throw new Error("Unable to decrypt HR record with the configured secrets.");
}
