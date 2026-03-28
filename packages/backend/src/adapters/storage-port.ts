import type { IfcFile, CreateIfcFile } from '@construction-ifc-tools/shared';

// === Storage Port ===
// Handles raw file storage (S3 in production, local filesystem in mock).
// When adding a new storage backend, implement this interface.
export interface StoragePort {
  /** Save a file buffer and return the storage key */
  saveFile(key: string, data: Buffer): Promise<string>;
  /** Retrieve a file buffer by its storage key */
  getFile(key: string): Promise<Buffer>;
  /** Delete a file by its storage key */
  deleteFile(key: string): Promise<void>;
  /** Check if a file exists */
  exists(key: string): Promise<boolean>;
}
