import type { IfcFile, CreateIfcFile, RenameIfcFile } from '@construction-ifc-tools/shared';

// === Metadata DB Port ===
// Handles IFC file metadata persistence (DynamoDB in production, CSV in mock).
// When adding a new domain's metadata, create a new port following this pattern.
export interface MetadataDbPort {
  /** List all IFC file metadata records */
  listFiles(): Promise<IfcFile[]>;
  /** Get a single file's metadata by ID */
  getFile(id: string): Promise<IfcFile | null>;
  /** Create a new metadata record. Returns the created record with generated ID. */
  createFile(data: CreateIfcFile): Promise<IfcFile>;
  /** Update a file's display name */
  renameFile(id: string, data: RenameIfcFile): Promise<IfcFile | null>;
  /** Delete a metadata record */
  deleteFile(id: string): Promise<boolean>;
  /** Update file status (e.g., processing → ready) */
  updateStatus(id: string, status: IfcFile['status']): Promise<void>;
}
