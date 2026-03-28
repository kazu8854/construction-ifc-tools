import { z } from 'zod';

// === IFC File Metadata ===
// Represents a stored IFC file's metadata record (persisted in DynamoDB / local CSV)
export const IfcFileSchema = z.object({
  id: z.string().uuid().describe('ファイルの一意識別子'),
  name: z.string().min(1).describe('表示用ファイル名（リネーム可能）'),
  originalName: z.string().describe('アップロード時の元ファイル名'),
  storageKey: z.string().describe('S3キー or ローカルファイルパス'),
  fileSize: z.number().describe('ファイルサイズ (bytes)'),
  source: z.enum(['upload', 'ai-generated']).describe('ファイルの由来 (手動アップロード or AI生成)'),
  status: z.enum(['ready', 'processing', 'error']).describe('処理状態'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type IfcFile = z.infer<typeof IfcFileSchema>;

// Schema for creating a new file metadata entry (without auto-generated fields)
export const CreateIfcFileSchema = IfcFileSchema.pick({
  name: true,
  originalName: true,
  storageKey: true,
  fileSize: true,
  source: true,
});
export type CreateIfcFile = z.infer<typeof CreateIfcFileSchema>;

// Schema for renaming a file
export const RenameIfcFileSchema = z.object({
  name: z.string().min(1).describe('新しいファイル名'),
});
export type RenameIfcFile = z.infer<typeof RenameIfcFileSchema>;
