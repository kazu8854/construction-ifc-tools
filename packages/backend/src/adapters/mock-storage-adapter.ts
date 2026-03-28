import * as fs from 'fs';
import * as path from 'path';
import type { StoragePort } from './storage-port';

// === Mock Storage Adapter (Local Filesystem) ===
// Persists IFC files to `./mock-storage/` directory.
// This ensures files survive process restarts and avoids memory pressure for large IFC files.
const MOCK_STORAGE_DIR = path.resolve(process.cwd(), 'mock-storage');

export class MockStorageAdapter implements StoragePort {
  constructor() {
    if (!fs.existsSync(MOCK_STORAGE_DIR)) {
      fs.mkdirSync(MOCK_STORAGE_DIR, { recursive: true });
    }
  }

  async saveFile(key: string, data: Buffer): Promise<string> {
    const filePath = path.join(MOCK_STORAGE_DIR, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, data);
    return key;
  }

  async getFile(key: string): Promise<Buffer> {
    const filePath = path.join(MOCK_STORAGE_DIR, key);
    return fs.readFileSync(filePath);
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(MOCK_STORAGE_DIR, key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(path.join(MOCK_STORAGE_DIR, key));
  }
}
