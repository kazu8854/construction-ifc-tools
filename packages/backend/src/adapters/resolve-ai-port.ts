import type { AiPort } from './ai-port';
import { MockAiAdapter } from './mock-ai-adapter';
import { OllamaAiAdapter } from './ollama-ai-adapter';

/**
 * USE_LOCAL_LLM=true → Ollama（OLLAMA_HOST / OLLAMA_MODEL）
 * それ以外 → Mock（固定サンプル IFC / モック回答）
 * 本番 Bedrock は今後 BedrockAiAdapter で差し替え。
 */
export function createAiPort(): AiPort {
  if (process.env.USE_LOCAL_LLM === 'true') {
    return new OllamaAiAdapter();
  }
  return new MockAiAdapter();
}
