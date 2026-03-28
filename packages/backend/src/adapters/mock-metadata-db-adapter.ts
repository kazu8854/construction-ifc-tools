import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { IfcFile, CreateIfcFile, RenameIfcFile } from '@construction-ifc-tools/shared';
import type { MetadataDbPort } from './metadata-db-port';

// === Mock Metadata DB Adapter (CSV File) ===
// Persists IFC file metadata to a local CSV file for mock/dev mode.
// Data survives process restarts. CSV format chosen for human readability.
const MOCK_DATA_DIR = path.resolve(process.cwd(), 'mock-storage');
const CSV_PATH = path.join(MOCK_DATA_DIR, 'metadata.csv');
const CSV_HEADER = 'id,name,originalName,storageKey,fileSize,source,status,createdAt,updatedAt';

export class MockMetadataDbAdapter implements MetadataDbPort {
  constructor() {
    if (!fs.existsSync(MOCK_DATA_DIR)) fs.mkdirSync(MOCK_DATA_DIR, { recursive: true });
    if (!fs.existsSync(CSV_PATH)) fs.writeFileSync(CSV_PATH, CSV_HEADER + '\n');
  }

  private readAll(): IfcFile[] {
    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = content.trim().split('\n').slice(1); // skip header
    return lines.filter(l => l.trim()).map(line => {
      const [id, name, originalName, storageKey, fileSize, source, status, createdAt, updatedAt] = line.split(',');
      return { id, name, originalName, storageKey, fileSize: Number(fileSize), source, status, createdAt, updatedAt } as IfcFile;
    });
  }

  private writeAll(records: IfcFile[]): void {
    const lines = records.map(r =>
      [r.id, r.name, r.originalName, r.storageKey, r.fileSize, r.source, r.status, r.createdAt, r.updatedAt].join(',')
    );
    fs.writeFileSync(CSV_PATH, CSV_HEADER + '\n' + lines.join('\n') + '\n');
  }

  async listFiles(): Promise<IfcFile[]> {
    return this.readAll();
  }

  async getFile(id: string): Promise<IfcFile | null> {
    return this.readAll().find(f => f.id === id) ?? null;
  }

  async createFile(data: CreateIfcFile): Promise<IfcFile> {
    const now = new Date().toISOString();
    const record: IfcFile = {
      id: randomUUID(),
      ...data,
      status: 'ready',
      createdAt: now,
      updatedAt: now,
    };
    const all = this.readAll();
    all.push(record);
    this.writeAll(all);
    return record;
  }

  async renameFile(id: string, data: RenameIfcFile): Promise<IfcFile | null> {
    const all = this.readAll();
    const idx = all.findIndex(f => f.id === id);
    if (idx === -1) return null;
    all[idx].name = data.name;
    all[idx].updatedAt = new Date().toISOString();
    this.writeAll(all);
    return all[idx];
  }

  async deleteFile(id: string): Promise<boolean> {
    const all = this.readAll();
    const filtered = all.filter(f => f.id !== id);
    if (filtered.length === all.length) return false;
    this.writeAll(filtered);
    return true;
  }

  async updateStatus(id: string, status: IfcFile['status']): Promise<void> {
    const all = this.readAll();
    const record = all.find(f => f.id === id);
    if (record) {
      record.status = status;
      record.updatedAt = new Date().toISOString();
      this.writeAll(all);
    }
  }
}
