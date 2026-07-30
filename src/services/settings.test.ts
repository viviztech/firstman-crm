import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { settings } from "@/db/schema/settings";
import { getSetting, getSettingForUpdate, setSetting } from "@/services/settings";

describe("settings service (integration)", () => {
  const usedKeys: string[] = [];

  afterEach(async () => {
    for (const key of usedKeys.splice(0)) {
      await db.delete(settings).where(eq(settings.key, key));
    }
  });

  function testKey(): string {
    const key = `test-setting-${randomUUID()}`;
    usedKeys.push(key);
    return key;
  }

  it("returns the default when a key has never been set", async () => {
    const value = await getSetting(testKey(), "fallback");
    expect(value).toBe("fallback");
  });

  it("round-trips a value through set then get", async () => {
    const key = testKey();
    await setSetting(key, { enabled: true }, null);
    const value = await getSetting<{ enabled: boolean }>(key, { enabled: false });
    expect(value).toEqual({ enabled: true });
  });

  it("updates an existing key in place rather than duplicating rows", async () => {
    const key = testKey();
    await setSetting(key, "first", null);
    await setSetting(key, "second", null);

    const value = await getSetting(key, "default");
    expect(value).toBe("second");

    const rows = await db.select().from(settings).where(eq(settings.key, key));
    expect(rows).toHaveLength(1);
  });

  it("getSettingForUpdate reads the current value inside a transaction", async () => {
    const key = testKey();
    await setSetting(key, "committed", null);

    const value = await db.transaction((tx) => getSettingForUpdate(key, "default", tx));
    expect(value).toBe("committed");
  });
});
