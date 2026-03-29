import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  extractIfcStep,
  resolveOllamaRequestTimeoutMs,
  stepOutputLooksLikeOutline,
} from '../src/adapters/ollama-ai-adapter';

describe('resolveOllamaRequestTimeoutMs', () => {
  let savedMs: string | undefined;
  let savedSec: string | undefined;

  beforeEach(() => {
    savedMs = process.env.OLLAMA_TIMEOUT_MS;
    savedSec = process.env.OLLAMA_TIMEOUT_SECONDS;
    delete process.env.OLLAMA_TIMEOUT_MS;
    delete process.env.OLLAMA_TIMEOUT_SECONDS;
  });

  afterEach(() => {
    if (savedMs === undefined) delete process.env.OLLAMA_TIMEOUT_MS;
    else process.env.OLLAMA_TIMEOUT_MS = savedMs;
    if (savedSec === undefined) delete process.env.OLLAMA_TIMEOUT_SECONDS;
    else process.env.OLLAMA_TIMEOUT_SECONDS = savedSec;
  });

  it('defaults to 600s', () => {
    expect(resolveOllamaRequestTimeoutMs()).toBe(600_000);
  });

  it('uses OLLAMA_TIMEOUT_MS when set', () => {
    process.env.OLLAMA_TIMEOUT_MS = '240000';
    expect(resolveOllamaRequestTimeoutMs()).toBe(240_000);
  });

  it('uses OLLAMA_TIMEOUT_SECONDS when MS unset', () => {
    process.env.OLLAMA_TIMEOUT_SECONDS = '123';
    expect(resolveOllamaRequestTimeoutMs()).toBe(123_000);
  });

  it('prefers OLLAMA_TIMEOUT_MS over SECONDS', () => {
    process.env.OLLAMA_TIMEOUT_MS = '111000';
    process.env.OLLAMA_TIMEOUT_SECONDS = '999';
    expect(resolveOllamaRequestTimeoutMs()).toBe(111_000);
  });
});

describe('stepOutputLooksLikeOutline', () => {
  it('detects markdown-style # ifc heading', () => {
    expect(stepOutputLooksLikeOutline('# ifc IFC4 FILE_SCHEMA entities:\n- IfcWall')).toBe(true);
  });

  it('detects FILE_SCHEMA entities inventory', () => {
    expect(stepOutputLooksLikeOutline('FILE_SCHEMA entities:\n- IfcRoot')).toBe(true);
  });

  it('detects bullet list of Ifc types without ISO header', () => {
    expect(stepOutputLooksLikeOutline('- IfcWall\n- IfcSlab')).toBe(true);
  });

  it('returns false for normal STEP preamble', () => {
    expect(stepOutputLooksLikeOutline('ISO-10303-21;\nHEADER;')).toBe(false);
  });
});

describe('extractIfcStep', () => {
  it('extracts plain ISO-10303-21 block', () => {
    const raw = 'preamble\nISO-10303-21;\nLINE;\nEND-ISO-10303-21;\ntrailing';
    expect(extractIfcStep(raw)).toBe('ISO-10303-21;\nLINE;\nEND-ISO-10303-21;');
  });

  it('strips markdown fence and extracts', () => {
    const raw = 'Here:\n```ifc\nISO-10303-21;\nX;\nEND-ISO-10303-21;\n```\n';
    expect(extractIfcStep(raw)).toBe('ISO-10303-21;\nX;\nEND-ISO-10303-21;');
  });

  it('returns null when start marker missing', () => {
    expect(extractIfcStep('END-ISO-10303-21;')).toBeNull();
  });

  it('returns null when end marker missing and no DATA', () => {
    expect(extractIfcStep('ISO-10303-21;\nLINE;')).toBeNull();
  });

  it('repairs truncated file: DATA + ENDSEC without END-ISO-10303-21', () => {
    const raw = 'ISO-10303-21;\nDATA;\n#1=X;\nENDSEC;\n';
    expect(extractIfcStep(raw)).toBe('ISO-10303-21;\nDATA;\n#1=X;\nENDSEC;\nEND-ISO-10303-21;');
  });

  it('accepts case-insensitive end marker', () => {
    const raw = 'ISO-10303-21;\nX;\nend-iso-10303-21;\n';
    expect(extractIfcStep(raw)).toBe('ISO-10303-21;\nX;\nEND-ISO-10303-21;');
  });

  it('strips think fenced block before extract', () => {
    const raw = '```think\nreasoning\n```\nISO-10303-21;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n';
    expect(extractIfcStep(raw)).toContain('ISO-10303-21;');
    expect(extractIfcStep(raw)).toContain('END-ISO-10303-21;');
  });
});
