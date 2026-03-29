// --- Shared Models & Schemas ---
// All types and Zod schemas used across frontend, backend, and infrastructure.

// IFC File metadata
export { IfcFileSchema, CreateIfcFileSchema, RenameIfcFileSchema } from './models/ifc-file';
export type { IfcFile, CreateIfcFile, RenameIfcFile } from './models/ifc-file';

// IFC Element (viewer/search results)
export { IfcElementSchema, IfcSearchSchema, COMMON_IFC_TYPES } from './models/ifc-element';
export type { IfcElement, IfcSearch } from './models/ifc-element';

// AI Generation & Graph Q&A
export { AiGenerateRequestSchema, AiJobStatusSchema, GraphQaRequestSchema, GraphQaResponseSchema } from './models/ai-models';
export type { AiGenerateRequest, AiJobStatus, GraphQaRequest, GraphQaResponse } from './models/ai-models';

// Legacy: User model (from template, keep for auth)
export { UserSchema, CreateUserSchema } from './models/user';
export type { User, CreateUserRequest } from './models/user';

export type { ApiResponse, PaginatedResponse } from './api/responses';
