/**
 * Storage abstraction so a self-hosted volume (Phase 4) can later be swapped for
 * Hetzner Object Storage / any S3-compatible endpoint purely via STORAGE_DRIVER (spec 1, 7).
 */
export interface StorageDriver {
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
