import type { AiPort } from './ai-port';
import { VIEWER_SAFE_MINIMAL_IFC, withViewerSafeProjectName } from './viewer-safe-ifc';

// === Mock AI Adapter ===
// Returns a small IFC4 model with triangulated mesh (buildingSMART tessellated-item sample).
// Ollama: set USE_LOCAL_LLM=true (see resolve-ai-port.ts, README).

export class MockAiAdapter implements AiPort {
  async generateIfc(prompt: string): Promise<string> {
    console.log(`[MockAI] Received prompt: "${prompt}"`);
    console.log('[MockAI] Returning viewer-safe tessellated IFC (1m cube proxy, IFC4)');
    return withViewerSafeProjectName(
      VIEWER_SAFE_MINIMAL_IFC,
      'Mock AI — viewer-safe 1m cube (IFC4 tessellation)',
    );
  }

  async answerQuestion(question: string, graphContext: string): Promise<string> {
    console.log(`[MockAI] Question: "${question}"`);
    return `[Mock AI Response] Based on the graph data, here is a simulated answer to "${question}". In production, Bedrock Claude 4.5 Sonnet will provide accurate answers based on the actual graph database context.`;
  }
}
