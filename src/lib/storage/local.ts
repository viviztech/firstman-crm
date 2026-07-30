import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver } from "@/lib/storage/types";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

/** Resolves a storage key to an absolute path, refusing anything that would escape STORAGE_ROOT. */
function resolveKey(key: string): string {
  const resolved = path.resolve(STORAGE_ROOT, key);
  if (resolved !== STORAGE_ROOT && !resolved.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

export const localStorageDriver: StorageDriver = {
  async save(key, data) {
    const filePath = resolveKey(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  },

  async read(key) {
    return readFile(resolveKey(key));
  },

  async delete(key) {
    await rm(resolveKey(key), { force: true });
  },
};
