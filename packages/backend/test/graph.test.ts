import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/index';
import { VIEWER_SAFE_MINIMAL_IFC } from '../src/adapters/viewer-safe-ifc';

describe('Graph API (integration)', () => {
  let fileId: string;

  beforeAll(async () => {
    const content = Buffer.from(VIEWER_SAFE_MINIMAL_IFC, 'utf-8').toString('base64');
    const up = await app.request('/api/files/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'graph-test.ifc', content }),
    });
    expect(up.status).toBe(201);
    const body = (await up.json()) as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    fileId = body.data.id;
  });

  afterAll(async () => {
    await app.request(`/api/files/${fileId}`, { method: 'DELETE' });
  });

  it('POST /api/graph/convert/:fileId builds graph from IFC', async () => {
    const conv = await app.request(`/api/graph/convert/${fileId}`, { method: 'POST' });
    expect(conv.status).toBe(201);
    const body = (await conv.json()) as {
      success: boolean;
      data: { nodeCount: number; edgeCount: number; summary: Record<string, number> };
    };
    expect(body.success).toBe(true);
    expect(body.data.nodeCount).toBeGreaterThan(0);
    expect(body.data.edgeCount).toBeGreaterThan(0);
    expect(body.data.summary.IfcBuildingElementProxy).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/graph/summary/:fileId returns counts', async () => {
    const res = await app.request(`/api/graph/summary/${fileId}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: Record<string, number> };
    expect(body.success).toBe(true);
    expect(Object.keys(body.data).length).toBeGreaterThan(0);
  });

  it('POST /api/graph/qa returns an answer when graph exists', async () => {
    const res = await app.request('/api/graph/qa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, question: 'What IFC types appear in this model summary?' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { answer: string } };
    expect(body.success).toBe(true);
    expect(body.data.answer.length).toBeGreaterThan(10);
  });
});
