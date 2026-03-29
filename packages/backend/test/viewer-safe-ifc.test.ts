import { describe, it, expect } from 'vitest';
import {
  VIEWER_SAFE_MINIMAL_IFC,
  isIfcLikelyRenderable,
  withViewerSafeProjectName,
} from '../src/adapters/viewer-safe-ifc';

describe('viewer-safe-ifc', () => {
  it('fixture contains tessellation and is marked renderable', () => {
    expect(VIEWER_SAFE_MINIMAL_IFC).toContain('IFCTRIANGULATEDFACESET');
    expect(isIfcLikelyRenderable(VIEWER_SAFE_MINIMAL_IFC)).toBe(true);
  });

  it('isIfcLikelyRenderable rejects spatial-only stub', () => {
    const stub = `ISO-10303-21;
DATA;
#1=IFCPROJECT('x',#2,'P',$,$,$,$,$,$);
#40=IFCWALLSTANDARDCASE('w',$,'Wall',$,$,#14,$,$);
ENDSEC;
END-ISO-10303-21;`;
    expect(isIfcLikelyRenderable(stub)).toBe(false);
  });

  it('withViewerSafeProjectName replaces project label', () => {
    const out = withViewerSafeProjectName(VIEWER_SAFE_MINIMAL_IFC, "User's demo");
    expect(out).toContain("'User''s demo'");
    expect(out).not.toContain('proxy with tessellation');
  });
});
