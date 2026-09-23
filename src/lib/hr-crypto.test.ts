import { createCipheriv, hkdfSync, randomBytes } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptHrJson, encryptHrJson, isHrEncryptionConfigured } from "@/lib/hr-crypto";

describe("private HR encryption", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the existing auth secret when a dedicated key is missing", () => {
    vi.stubEnv("HR_DATA_ENCRYPTION_KEY", "");
    expect(isHrEncryptionConfigured()).toBe(true);
    const ciphertext = encryptHrJson({ name: "secret" }, "employee:one");
    expect(ciphertext).toMatch(/^v2:/);
    expect(decryptHrJson(ciphertext, "employee:one")).toEqual({ name: "secret" });
  });

  it("always writes derived v2 records even when a legacy key is configured", () => {
    vi.stubEnv("HR_DATA_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
    const payload = { address: "Sensitive address", phone: "+919999999999" };
    const ciphertext = encryptHrJson(payload, "employee:one:details");
    expect(ciphertext).toMatch(/^v2:/);
    expect(ciphertext).not.toContain("Sensitive address");
    expect(decryptHrJson(ciphertext, "employee:one:details")).toEqual(payload);
  });

  it("can recover a v2 record with the temporary previous auth secret", () => {
    const previousSecret = "previous-auth-secret-with-at-least-32-characters";
    const context = "employee:previous:details";
    const nonce = randomBytes(12);
    const key = Buffer.from(
      hkdfSync("sha256", previousSecret, "firstman-crm-hr-data", "employee-private-records-v2", 32),
    );
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    cipher.setAAD(Buffer.from(context));
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify({ value: "old" })),
      cipher.final(),
    ]);
    const ciphertext = [
      "v2",
      nonce.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      encrypted.toString("base64url"),
    ].join(":");
    expect(() => decryptHrJson(ciphertext, context)).toThrow("Unable to decrypt");
    vi.stubEnv("HR_DATA_PREVIOUS_AUTH_SECRET", previousSecret);
    expect(decryptHrJson(ciphertext, context)).toEqual({ value: "old" });
  });

  it("rejects a swapped record or tampered ciphertext", () => {
    vi.stubEnv("HR_DATA_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
    const ciphertext = encryptHrJson({ value: "private" }, "employee:one:details");
    expect(() => decryptHrJson(ciphertext, "employee:two:details")).toThrow();
    const parts = ciphertext.split(":");
    if (!parts[3]) throw new Error("Missing ciphertext");
    parts[3] = `${parts[3].startsWith("A") ? "B" : "A"}${parts[3].slice(1)}`;
    expect(() => decryptHrJson(parts.join(":"), "employee:one:details")).toThrow();
  });
});
