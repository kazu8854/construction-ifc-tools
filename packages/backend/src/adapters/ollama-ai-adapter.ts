import type { AiPort } from './ai-port';
import {
  VIEWER_SAFE_MINIMAL_IFC,
  isIfcLikelyRenderable,
  withViewerSafeProjectName,
} from './viewer-safe-ifc';

const DEFAULT_BASE = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'llama3.2';
const CHAT_PATH = '/api/chat';
/** Local IFC generation is slow (large ctx + long output); was 180s and often too tight. */
const DEFAULT_REQUEST_TIMEOUT_MS = 600_000;
const MIN_REQUEST_TIMEOUT_MS = 30_000;
const MAX_REQUEST_TIMEOUT_MS = 3_600_000;

/** Milliseconds for Ollama `/api/chat` (IFC generate + graph QA). Override with OLLAMA_TIMEOUT_MS or OLLAMA_TIMEOUT_SECONDS. */
export function resolveOllamaRequestTimeoutMs(): number {
  const rawMs = process.env.OLLAMA_TIMEOUT_MS;
  if (rawMs !== undefined && rawMs !== '') {
    const n = Number(rawMs);
    if (Number.isFinite(n)) {
      return Math.min(MAX_REQUEST_TIMEOUT_MS, Math.max(MIN_REQUEST_TIMEOUT_MS, n));
    }
  }
  const rawSec = process.env.OLLAMA_TIMEOUT_SECONDS;
  if (rawSec !== undefined && rawSec !== '') {
    const n = Number(rawSec) * 1000;
    if (Number.isFinite(n)) {
      return Math.min(MAX_REQUEST_TIMEOUT_MS, Math.max(MIN_REQUEST_TIMEOUT_MS, n));
    }
  }
  return DEFAULT_REQUEST_TIMEOUT_MS;
}

/**
 * Avoid markdown-style bullets in the system text — some small models mirror them as "# ifc … / - IfcFoo" outlines instead of STEP.
 */
const IFC_SYSTEM_PROMPT = `You are a STEP physical file writer for IFC. Your entire reply must be one valid .ifc file, nothing else.

The first non-whitespace characters must be: ISO-10303-21;
The file must end with: END-ISO-10303-21;
Use HEADER; … DATA; … ENDSEC; structure. Lines in DATA look like: #10=IFCPROJECT('0x1',$,'Project',$,$,$,$,$,(#20),#30); (hash, digits, equals, IFC typename in capitals, parentheses, semicolon).

FORBIDDEN in your reply: Markdown (# headings, **bold**, bullet lists), YAML, "entities:" inventories, English explanations, code fences, or listing class names like "- IfcWall". Those are not STEP.

Required 3D geometry: include IFCEXTRUDEDAREASOLID and/or IFCTRIANGULATEDFACESET inside DATA. Visible products need IFCPRODUCTDEFINITIONSHAPE and IFCSHAPEREPRESENTATION with real # references (not $). Extrusion uses IFCRECTANGLEPROFILEDEF or profile + IFCEXTRUDEDAREASOLID; tessellation uses IFCTRIANGULATEDFACESET with IFCCARTESIANPOINTLIST3D (IFC4). FILE_SCHEMA must match the entities you use. Keep one storey and one or two elements; stay small.`;

const IFC_USER_REMINDER = `Output ONLY the STEP file starting with ISO-10303-21; — no markdown, no "# ifc" heading, no bullet list of IFC types.`;

/** Heuristic: model returned a doc outline instead of STEP (common with small LLMs). */
export function stepOutputLooksLikeOutline(raw: string): boolean {
  const t = raw.trim().slice(0, 3000);
  if (/^\s*#\s+ifc\b/i.test(t)) return true;
  if (/FILE_SCHEMA\s+entities/i.test(t)) return true;
  if (!/ISO-10303-21/i.test(t) && /(?:^|\n)\s*-\s*Ifc[A-Z]/im.test(t)) return true;
  return false;
}

const QA_SYSTEM_PROMPT = `You are a BIM assistant. Answer using the provided graph summary JSON only.
Be concise. If the context is insufficient, say so. No markdown code blocks unless showing small JSON.`;

function stripThinkTags(s: string): string {
  return s
    .replace(new RegExp('```\\s*think\\s*[\\s\\S]*?```', 'gi'), '')
    .replace(new RegExp('```\\s*redacted_reasoning\\s*[\\s\\S]*?```', 'gi'), '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
}

function collectStepCandidates(raw: string): string[] {
  const s = stripThinkTags(raw).replace(/\r\n/g, '\n').trim();
  const candidates: string[] = [];
  const seen = new Set<string>();
  const add = (x: string) => {
    const t = x.trim();
    if (t.length > 0 && !seen.has(t)) {
      seen.add(t);
      candidates.push(t);
    }
  };
  add(s);
  const fenceRe = /```(?:[\w.-]*)\s*\n?([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(s)) !== null) add(m[1]);
  const openIdx = s.indexOf('```');
  if (openIdx !== -1 && !/\bEND-ISO-10303-21\s*;/i.test(s)) {
    const after = s.slice(openIdx + 3).replace(/^(?:ifc|step)\s*\n?/i, '');
    const close = after.indexOf('```');
    add(close === -1 ? after : after.slice(0, close));
  }
  return candidates;
}

/**
 * Pull IFC STEP from model output: markdown fences, case variants, missing final line (truncation).
 */
export function extractIfcStep(raw: string): string | null {
  for (const c of collectStepCandidates(raw)) {
    const got = tryExtractStepFromCandidate(c);
    if (got) return got;
  }
  return null;
}

function tryExtractStepFromCandidate(s: string): string | null {
  const norm = s.replace(/\r\n/g, '\n');
  const startM = /ISO-10303-21\s*;/i.exec(norm);
  if (!startM) return null;
  let body = norm.slice(startM.index);
  const endRe = /END-ISO-10303-21\s*;?/i;
  const endM = endRe.exec(body);
  if (endM) {
    let out = body.slice(0, endM.index + endM[0].length).trimEnd();
    if (!/;\s*$/i.test(out)) out += ';';
    out = out.replace(/END-ISO-10303-21\s*;?\s*$/i, 'END-ISO-10303-21;');
    return out;
  }
  if (!/\bDATA\s*;/i.test(body)) return null;
  const t = body.trimEnd();
  if (/\bENDSEC\s*;\s*$/i.test(t)) return `${t}\nEND-ISO-10303-21;`;
  if (!/\bENDSEC\s*;/i.test(t)) return `${t}\nENDSEC;\nEND-ISO-10303-21;`;
  return null;
}

type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

export class OllamaAiAdapter implements AiPort {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly requestTimeoutMs: number;

  constructor() {
    this.baseUrl = (process.env.OLLAMA_HOST || DEFAULT_BASE).replace(/\/$/, '');
    this.model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
    this.requestTimeoutMs = resolveOllamaRequestTimeoutMs();
  }

  private async chat(system: string, user: string): Promise<string> {
    const url = `${this.baseUrl}${CHAT_PATH}`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          stream: false,
          options: {
            num_ctx: (() => {
              const n = Number(process.env.OLLAMA_NUM_CTX ?? '8192');
              return Number.isFinite(n) && n >= 2048 ? n : 8192;
            })(),
          },
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`Ollama HTTP ${res.status}: ${text.slice(0, 500)}`);
      }
      let data: OllamaChatResponse;
      try {
        data = JSON.parse(text) as OllamaChatResponse;
      } catch {
        throw new Error(`Ollama returned non-JSON: ${text.slice(0, 200)}`);
      }
      if (data.error) {
        throw new Error(`Ollama: ${data.error}`);
      }
      const content = data.message?.content?.trim();
      if (!content) {
        throw new Error('Ollama returned an empty message');
      }
      return content;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error(
          `Ollama request timed out after ${this.requestTimeoutMs / 1000}s (set OLLAMA_TIMEOUT_MS or OLLAMA_TIMEOUT_SECONDS to increase; default is ${DEFAULT_REQUEST_TIMEOUT_MS / 1000}s)`,
        );
      }
      if (e instanceof TypeError && String(e.message).includes('fetch')) {
        throw new Error(
          `Cannot reach Ollama at ${this.baseUrl}. Is \`ollama serve\` running and is OLLAMA_HOST correct?`,
        );
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }

  async generateIfc(prompt: string): Promise<string> {
    const userMessage = `${prompt.trim()}\n\n${IFC_USER_REMINDER}`;
    const raw = await this.chat(IFC_SYSTEM_PROMPT, userMessage);
    let step = extractIfcStep(raw);
    if (!step) {
      const preview = raw.replace(/\s+/g, ' ').trim().slice(0, 280);
      const outlinePart = stepOutputLooksLikeOutline(raw)
        ? 'The model returned an outline or markdown (not STEP lines like #1=IFCPROJECT(...);). Try OLLAMA_MODEL=qwen2.5-coder:7b or a larger model. '
        : '';
      throw new Error(
        `Model output could not be parsed as IFC STEP (need ISO-10303-21; through END-ISO-10303-21;). ${outlinePart}` +
          `Try: OLLAMA_NUM_CTX=16384+, shorter user prompt, or a coder-oriented model. ` +
          (preview ? `Output preview: ${preview}` : ''),
      );
    }
    if (!isIfcLikelyRenderable(step)) {
      console.warn(
        '[OllamaAI] Model output has no recognizable 3D body (extrusion/tessellation); using viewer-safe fallback IFC',
      );
      const short = prompt.replace(/\r?\n/g, ' ').trim().slice(0, 80);
      step = withViewerSafeProjectName(
        VIEWER_SAFE_MINIMAL_IFC,
        short ? `Ollama fallback (add IfcExtrudedAreaSolid etc.): ${short}` : 'Ollama fallback (no mesh in model output)',
      );
    }
    return step;
  }

  async answerQuestion(question: string, graphContext: string): Promise<string> {
    const user = `Graph summary (JSON):\n${graphContext}\n\nQuestion: ${question}`;
    return this.chat(QA_SYSTEM_PROMPT, user);
  }
}
