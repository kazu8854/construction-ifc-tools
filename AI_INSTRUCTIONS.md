# AI Architect Instructions: construction-ifc-tools

This repository is a monorepo for Managing, Visualizing, and AI-analyzing IFC (Industry Foundation Classes) files.
Any AI coding assistant generating code or configurations for this repository MUST adhere strictly to the rules below.

## 1. Architecture: Ports and Adapters (Hexagonal Architecture)
* **Backend (`packages/backend`)**: MUST separate business logic from infrastructure using interfaces (Ports).
  * All AWS-specific logic (S3, DynamoDB, Neptune, Bedrock) MUST be abstracted behind adapter interfaces in `src/adapters/`.
  * Mock implementations MUST persist data to the local filesystem, NOT in-memory:
    * **Files**: `./mock-storage/` directory (local FS)
    * **Metadata**: `./mock-storage/metadata.csv` (CSV file)
    * **Graph data**: `./mock-storage/graphs/<fileId>.json` (JSON files)
* **Testing / Mocking**: The project MUST support running completely offline with `MOCK_AWS=true`.
* **Frameworks**: Backend routing MUST use `hono`.

## 2. Adding a New Domain (Step-by-Step)
When adding a new feature domain (e.g., "reports", "schedules"), follow this exact pattern:

### Backend
1. Create `packages/backend/src/adapters/<domain>-port.ts` — Define the interface
2. Create `packages/backend/src/adapters/mock-<domain>-adapter.ts` — Mock implementation (CSV or JSON file persistence)
3. Create `packages/backend/src/api/<domain>.ts` — Hono sub-router with DI at the top
4. Mount in `packages/backend/src/index.ts`: `app.route('/api/<domain>', domainApp)` — Chain on the `routes` variable
5. Add Zod schemas in `packages/shared/src/models/<domain>.ts` and re-export from `index.ts`

### Frontend
1. Create `packages/frontend/src/pages/<DomainPage>.tsx` — Page component
2. Add route in `packages/frontend/src/App.tsx` — Inside `<Route path="/" element={<Layout />}>`
3. Add navigation link in `packages/frontend/src/components/Layout.tsx` — In the `SideNavigation` items array
4. Call backend via `packages/frontend/src/api/client.ts` — Use Hono RPC client (`client.api.<domain>.$get()` etc.)

## 3. Testing & Quality Assurance (MUST)
* **Framework Split**:
  * `packages/infrastructure` (CDK): **Jest**
  * `packages/backend` and `packages/frontend`: **Vitest**
* **Backend Tests**: Integration tests using Hono's `app.request()` against Mock adapters.
* **Frontend Tests**: Component tests using `@testing-library/react`.
* **Coverage**: `npm run test:coverage` generates HTML + LCOV reports in `coverage/`.

## 4. IFC-Specific Rules
* **IFC Parsing**: MUST use `web-ifc` (WebAssembly) for parsing IFC files.
* **3D Rendering**: MUST use `@thatopen/components` + Three.js for the viewer.
* **File Size Limit**: API Gateway integration limits uploads to ~10MB. Document S3 Presigned URL approach in README/Future for larger files.

## 5. AI Model Configuration
* **Production**: Amazon Bedrock — Claude 4.5 Sonnet
* **Mock Mode**: Hardcoded sample responses (no AI calls)
* **Optional Local LLM**: Ollama can be used for richer offline AI experience. Configure via `USE_LOCAL_LLM=true` environment variable.
  * Install: `curl -fsSL https://ollama.ai/install.sh | sh && ollama pull llama3.2`
  * The `AiPort` adapter pattern allows swapping between Bedrock/Ollama/Mock transparently.

## 6. GraphDB Strategy
* **Production**: Amazon Neptune Serverless (openCypher). Cost ~$117+/mo minimum.
  * When Neptune is not needed: export graph data to S3 as JSON and delete the cluster.
  * When needed: re-import from S3 JSON export.
* **Mock**: Local JSON file persistence (`./mock-storage/graphs/`).

## 7. Infrastructure as Code
* MUST use **AWS CDK** (`packages/infrastructure`).
* Use `cdk watch` for development iteration.

## 8. Shared Resources
* **`packages/shared`**: ALL domain models, API types, and Zod schemas MUST be defined here.
* Both frontend and backend MUST import from `@construction-ifc-tools/shared`.

## 9. Workspaces and Dependencies
* Built on `npm workspaces`.
* Do NOT install dependencies globally.

## 10. Asynchronous AI Operations (Strongly Recommended)
* **AI IFC Generation**: Return HTTP 202 immediately, run generation asynchronously, notify via AppSync Events.
* This avoids API Gateway's 29-second timeout limit for long-running Bedrock invocations.

## 11. Authentication
* **Production**: Amazon Cognito (SSO-capable IdP)
* **Mock**: SessionStorage-based mock auth
* **CRITICAL**: Mock auth flow MUST NOT be enabled in Production.

**If you, the AI, are updating this project, do not propose generic architectural changes that violate these rules without explicit user approval.**
