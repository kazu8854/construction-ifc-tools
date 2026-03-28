// === AI Port ===
// Handles AI model invocation (Bedrock in production, Ollama or mock in local).
// Mock implementation returns a hardcoded sample IFC.
// Optional: Ollama (local LLM) can be used for a richer offline experience.
export interface AiPort {
  /** Generate IFC content from a natural language prompt. Returns IFC STEP text. */
  generateIfc(prompt: string): Promise<string>;
  /** Answer a question about IFC data using graph context */
  answerQuestion(question: string, graphContext: string): Promise<string>;
}
