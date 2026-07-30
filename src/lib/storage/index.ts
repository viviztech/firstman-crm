import { env } from "@/lib/env";
import { localStorageDriver } from "@/lib/storage/local";
import type { StorageDriver } from "@/lib/storage/types";

export type { StorageDriver } from "@/lib/storage/types";

export function getStorageDriver(): StorageDriver {
  if (env.STORAGE_DRIVER === "s3") {
    // Hetzner Object Storage (or any S3-compatible endpoint) — implement against the same
    // StorageDriver interface when S3_* credentials are provisioned at deploy time.
    throw new Error("S3 storage driver is not implemented yet — set STORAGE_DRIVER=local");
  }
  return localStorageDriver;
}
