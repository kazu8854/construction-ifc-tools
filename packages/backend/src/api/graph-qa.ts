import { Hono } from 'hono';
import type { GraphPort } from '../adapters/graph-port';
import type { AiPort } from '../adapters/ai-port';
import { GraphQaRequestSchema } from '@construction-ifc-tools/shared';

// === Graph Q&A API Route (Phase 4 - Optional) ===
// Handles natural language questions about IFC data stored in a graph database.
// In production: queries Neptune, then feeds context to Bedrock Claude 4.5 Sonnet.
// In mock: queries local JSON graph, then uses MockAI for response.

import { MockGraphAdapter } from '../adapters/mock-graph-adapter';
import { createAiPort } from '../adapters/resolve-ai-port';

const isMock = process.env.MOCK_AWS === 'true';
const graph: GraphPort = isMock ? new MockGraphAdapter() : new MockGraphAdapter(); // TODO: replace with NeptuneAdapter
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

  // POST /api/graph/convert/:fileId - Convert IFC to graph
  .post('/convert/:fileId', async (c) => {
    // TODO: Implement IFC parsing → graph node/edge extraction
    // Uses web-ifc to parse the IFC file and extract spatial relationships
    return c.json({ success: false, error: 'Not yet implemented. See Phase 4 in README.' }, 501);
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
