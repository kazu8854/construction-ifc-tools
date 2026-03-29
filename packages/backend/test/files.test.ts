import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('Files API (integration)', () => {
  it('GET /api/files returns a list', async () => {
    const res = await app.request('/api/files');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('upload (JSON base64), rename, delete lifecycle', async () => {
    const content = Buffer.from('ISO-10303-21;').toString('base64');
    const up = await app.request('/api/files/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'phase1-test.ifc', content }),
    });
    expect(up.status).toBe(201);
    const created = (await up.json()) as { success: boolean; data: { id: string; name: string; storageKey: string } };
    expect(created.success).toBe(true);
    const id = created.data.id;

    const getOne = await app.request(`/api/files/${id}`);
    expect(getOne.status).toBe(200);

    const renamed = await app.request(`/api/files/${id}/rename`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'renamed.ifc' }),
    });
    expect(renamed.status).toBe(200);
    const renameBody = (await renamed.json()) as { success: boolean; data: { name: string } };
    expect(renameBody.data.name).toBe('renamed.ifc');

    const del = await app.request(`/api/files/${id}`, { method: 'DELETE' });
    expect(del.status).toBe(200);

    const gone = await app.request(`/api/files/${id}`);
    expect(gone.status).toBe(404);
  });

  it('rejects non-.ifc upload', async () => {
    const content = Buffer.from('x').toString('base64');
    const res = await app.request('/api/files/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'readme.txt', content }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /api/files/:id/download returns binary', async () => {
    const content = Buffer.from('ISO-10303-21;').toString('base64');
    const up = await app.request('/api/files/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'dl-test.ifc', content }),
    });
    const created = (await up.json()) as { data: { id: string } };
    const id = created.data.id;

    const dl = await app.request(`/api/files/${id}/download`);
    expect(dl.status).toBe(200);
    const ct = dl.headers.get('content-type') ?? '';
    expect(ct).toContain('octet-stream');
    const body = new Uint8Array(await dl.arrayBuffer());
    expect(body.length).toBeGreaterThan(0);

    await app.request(`/api/files/${id}`, { method: 'DELETE' });
  });
});
