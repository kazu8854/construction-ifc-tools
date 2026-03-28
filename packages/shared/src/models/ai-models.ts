import { z } from 'zod';

// === AI IFC Generation Request ===
export const AiGenerateRequestSchema = z.object({
  prompt: z.string().min(10).describe('IFC生成のための自然言語プロンプト（例：3部屋の平屋、窓2つ、ドア1つ）'),
  fileName: z.string().optional().describe('生成後に付けるファイル名（省略時は自動生成）'),
});
export type AiGenerateRequest = z.infer<typeof AiGenerateRequestSchema>;

// === AI Generation Job Status ===
export const AiJobStatusSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['pending', 'generating', 'complete', 'error']),
  fileId: z.string().uuid().optional().describe('生成完了時のIFCファイルID'),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type AiJobStatus = z.infer<typeof AiJobStatusSchema>;

// === Graph Q&A Request ===
export const GraphQaRequestSchema = z.object({
  fileId: z.string().uuid().describe('質問対象のIFCファイルID'),
  question: z.string().min(5).describe('自然言語の質問（例：窓はいくつありますか？）'),
});
export type GraphQaRequest = z.infer<typeof GraphQaRequestSchema>;

// === Graph Q&A Response ===
export const GraphQaResponseSchema = z.object({
  answer: z.string().describe('AIによる回答'),
  sources: z.array(z.object({
    elementType: z.string(),
    count: z.number().optional(),
    details: z.string().optional(),
  })).optional().describe('回答の根拠となったグラフデータ'),
});
export type GraphQaResponse = z.infer<typeof GraphQaResponseSchema>;
