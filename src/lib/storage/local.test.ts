import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { localStorageDriver } from "@/lib/storage/local";

describe("localStorageDriver", () => {
  const writtenKeys: string[] = [];

  afterEach(async () => {
    for (const key of writtenKeys.splice(0)) {
      await localStorageDriver.delete(key).catch(() => undefined);
    }
  });

  function testKey(): string {
    const key = `test/${randomUUID()}.bin`;
    writtenKeys.push(key);
    return key;
  }

  it("round-trips a saved file through read", async () => {
    const key = testKey();
    const data = Buffer.from("hello world");

    await localStorageDriver.save(key, data);
    const read = await localStorageDriver.read(key);

    expect(read.equals(data)).toBe(true);
  });

  it("creates nested directories as needed", async () => {
    const key = `test/${randomUUID()}/${randomUUID()}/file.bin`;
    writtenKeys.push(key);
    const data = Buffer.from("nested");

    await localStorageDriver.save(key, data);
    expect((await localStorageDriver.read(key)).equals(data)).toBe(true);
  });

  it("removes a file on delete", async () => {
    const key = testKey();
    await localStorageDriver.save(key, Buffer.from("to be deleted"));

    await localStorageDriver.delete(key);

    await expect(localStorageDriver.read(key)).rejects.toThrow();
  });

  it("refuses to save outside the storage root (path traversal)", async () => {
    await expect(localStorageDriver.save("../../etc/passwd", Buffer.from("x"))).rejects.toThrow(
      "Invalid storage key",
    );
  });

  it("refuses to read outside the storage root (path traversal)", async () => {
    await expect(localStorageDriver.read("../../etc/passwd")).rejects.toThrow(
      "Invalid storage key",
    );
  });
});
