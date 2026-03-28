import { Hono } from 'hono';
import type { AiPort } from '../adapters/ai-port';
import type { MetadataDbPort } from '../adapters/metadata-db-port';
import type { StoragePort } from '../adapters/storage-port';
import { AiGenerateRequestSchema } from '@construction-ifc-tools/shared';

// === AI Generate API Route ===
// Handles AI-powered IFC file generation.
// In production: invokes Bedrock Claude 4.5 Sonnet asynchronously.
// In mock: returns a hardcoded sample IFC immediately.
// Optional: Ollama (local LLM) for richer offline experience.

import { MockAiAdapter } from '../adapters/mock-ai-adapter';
import { MockMetadataDbAdapter } from '../adapters/mock-metadata-db-adapter';
import { MockStorageAdapter } from '../adapters/mock-storage-adapter';

const isMock = process.env.MOCK_AWS === 'true';
const ai: AiPort = isMock ? new MockAiAdapter() : new MockAiAdapter(); // TODO: replace with BedrockAdapter
const metadataDb: MetadataDbPort = isMock ? new MockMetadataDbAdapter() : new MockMetadataDbAdapter();
const storage: StoragePort = isMock ? new MockStorageAdapter() : new MockStorageAdapter();

export const aiGenerateApp = new Hono()
  // POST /api/ai/generate - Generate IFC from prompt
  .post('/generate', async (c) => {
    const body = await c.req.json();
    const parsed = AiGenerateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid input', details: parsed.error.flatten() }, 400);
    }

    const { prompt, fileName } = parsed.data;

    // In mock mode: synchronous for simplicity.
    // In production: this would return 202 and process asynchronously via Lambda + AppSync Events.
    const ifcContent = await ai.generateIfc(prompt);
    const buffer = Buffer.from(ifcContent, 'utf-8');
    const name = fileName || `ai-generated-${Date.now()}.ifc`;
    const storageKey = `ifc/ai/${Date.now()}_${name}`;

    await storage.saveFile(storageKey, buffer);
    const record = await metadataDb.createFile({
      name,
      originalName: name,
      storageKey,
      fileSize: buffer.length,
      source: 'ai-generated',
    });

    return c.json({ success: true, data: record }, 201);
  });
