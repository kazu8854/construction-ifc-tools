import { Hono } from 'hono';
import type { GraphPort } from '../adapters/graph-port';
import type { AiPort } from '../adapters/ai-port';
import type { MetadataDbPort } from '../adapters/metadata-db-port';
import type { StoragePort } from '../adapters/storage-port';
import { GraphQaRequestSchema } from '@construction-ifc-tools/shared';

// === Graph Q&A API Route (Phase 4) ===
// Mock: JSON graph files + web-ifc IFC→graph convert. Production: Neptune + Bedrock.

import { MockGraphAdapter } from '../adapters/mock-graph-adapter';
import { MockMetadataDbAdapter } from '../adapters/mock-metadata-db-adapter';
import { MockStorageAdapter } from '../adapters/mock-storage-adapter';
import { createAiPort } from '../adapters/resolve-ai-port';
import { extractGraphFromIfc } from '../services/ifc-to-graph';

const isMock = process.env.MOCK_AWS === 'true';
const graph: GraphPort = isMock ? new MockGraphAdapter() : new MockGraphAdapter(); // TODO: NeptuneAdapter
const metadataDb: MetadataDbPort = isMock ? new MockMetadataDbAdapter() : new MockMetadataDbAdapter();
const storage: StoragePort = isMock ? new MockStorageAdapter() : new MockStorageAdapter();
const ai: AiPort = createAiPort();

export const graphQaApp = new Hono()
  // POST /api/graph/qa - Ask a question about IFC data
  .post('/qa', async (c) => {
    const body = await c.req.json();
    const parsed = GraphQaRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }

    const { fileId, question } = parsed.data;
    const hasGraph = await graph.hasGraph(fileId);
    if (!hasGraph) {
      return c.json({ success: false, error: 'Graph data not found. Please convert the IFC file to graph first.' }, 404);
    }

    // Get summary as context for AI
    const summary = await graph.getSummary(fileId);
    const graphContext = JSON.stringify(summary);

    let answer: string;
    try {
      answer = await ai.answerQuestion(question, graphContext);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI answer failed';
      return c.json({ success: false, error: msg }, 502);
    }
    return c.json({
      success: true,
      data: {
        answer,
        sources: Object.entries(summary).map(([type, count]) => ({ elementType: type, count })),
      }
    }, 200);
  })

  // POST /api/graph/convert/:fileId - Convert IFC to graph (web-ifc → JSON in mock)
  .post('/convert/:fileId', async (c) => {
    const fileId = c.req.param('fileId');
    const file = await metadataDb.getFile(fileId);
    if (!file) {
      return c.json({ success: false, error: 'File not found' }, 404);
    }
    try {
      const buf = await storage.getFile(file.storageKey);
      const { nodes, edges } = await extractGraphFromIfc(buf);
      await graph.saveGraph(fileId, nodes, edges);
      const summary = await graph.getSummary(fileId);
      return c.json(
        {
          success: true,
          data: {
            fileId,
            nodeCount: nodes.length,
            edgeCount: edges.length,
            summary,
          },
        },
        201,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'IFC to graph conversion failed';
      return c.json({ success: false, error: msg }, 422);
    }
  })

  // GET /api/graph/summary/:fileId - Get graph summary
  .get('/summary/:fileId', async (c) => {
    const fileId = c.req.param('fileId');
    const hasGraph = await graph.hasGraph(fileId);
    if (!hasGraph) return c.json({ success: false, error: 'No graph data' }, 404);
    const summary = await graph.getSummary(fileId);
    return c.json({ success: true, data: summary }, 200);
  })

  // GET /api/graph/export/:fileId - Export graph data as JSON
  .get('/export/:fileId', async (c) => {
    const fileId = c.req.param('fileId');
    const data = await graph.exportGraph(fileId);
    return c.json({ success: true, data }, 200);
  });
