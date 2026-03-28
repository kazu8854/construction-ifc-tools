import { Hono } from 'hono';
import { RenameIfcFileSchema } from '@construction-ifc-tools/shared';
import type { MetadataDbPort } from '../adapters/metadata-db-port';
import type { StoragePort } from '../adapters/storage-port';

// === IFC Files API Route ===
// Handles CRUD operations for IFC files (upload, list, rename, delete).
// To add a new domain, follow this exact pattern:
// 1. Create src/api/<domain>.ts
// 2. Inject ports via constructor or module-level DI
// 3. Chain routes on a new Hono() instance
// 4. Mount in src/index.ts via app.route('/api/<domain>', domainApp)

// --- DI ---
import { MockMetadataDbAdapter } from '../adapters/mock-metadata-db-adapter';
import { MockStorageAdapter } from '../adapters/mock-storage-adapter';

const isMock = process.env.MOCK_AWS === 'true';
const metadataDb: MetadataDbPort = isMock ? new MockMetadataDbAdapter() : new MockMetadataDbAdapter(); // TODO: replace with DynamoDbAdapter
const storage: StoragePort = isMock ? new MockStorageAdapter() : new MockStorageAdapter(); // TODO: replace with S3Adapter

export const filesApp = new Hono()
  // GET /api/files - List all IFC files
  .get('/', async (c) => {
    const files = await metadataDb.listFiles();
    return c.json({ success: true, data: files }, 200);
  })

  // GET /api/files/:id - Get single file metadata
  .get('/:id', async (c) => {
    const file = await metadataDb.getFile(c.req.param('id'));
    if (!file) return c.json({ success: false, error: 'File not found' }, 404);
    return c.json({ success: true, data: file }, 200);
  })

  // POST /api/files/upload - Upload an IFC file
  .post('/upload', async (c) => {
    // TODO: Implement multipart form data parsing for file upload
    // For now, accept JSON with base64 encoded content
    const body = await c.req.json();
    const { fileName, content } = body as { fileName: string; content: string };
    
    const buffer = Buffer.from(content, 'base64');
    const storageKey = `ifc/${Date.now()}_${fileName}`;
    await storage.saveFile(storageKey, buffer);

    const record = await metadataDb.createFile({
      name: fileName,
      originalName: fileName,
      storageKey,
      fileSize: buffer.length,
      source: 'upload',
    });

    return c.json({ success: true, data: record }, 201);
  })

  // PATCH /api/files/:id/rename - Rename file
  .patch('/:id/rename', async (c) => {
    const body = await c.req.json();
    const parsed = RenameIfcFileSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }
    const result = await metadataDb.renameFile(c.req.param('id'), parsed.data);
    if (!result) return c.json({ success: false, error: 'File not found' }, 404);
    return c.json({ success: true, data: result }, 200);
  })

  // DELETE /api/files/:id - Delete file
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    const file = await metadataDb.getFile(id);
    if (!file) return c.json({ success: false, error: 'File not found' }, 404);

    await storage.deleteFile(file.storageKey);
    await metadataDb.deleteFile(id);
    return c.json({ success: true }, 200);
  });
