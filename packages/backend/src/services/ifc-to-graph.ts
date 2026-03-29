import { IfcAPI } from 'web-ifc';
import * as WebIFC from 'web-ifc';
import type { GraphEdge, GraphNode } from '../adapters/graph-port';

const PRODUCT_TYPE_IDS: number[] = [
  WebIFC.IFCPROJECT,
  WebIFC.IFCSITE,
  WebIFC.IFCBUILDING,
  WebIFC.IFCBUILDINGSTOREY,
  WebIFC.IFCWALL,
  WebIFC.IFCWALLSTANDARDCASE,
  WebIFC.IFCWALLELEMENTEDCASE,
  WebIFC.IFCDOOR,
  WebIFC.IFCDOORSTANDARDCASE,
  WebIFC.IFCWINDOW,
  WebIFC.IFCWINDOWSTANDARDCASE,
  WebIFC.IFCSLAB,
  WebIFC.IFCSLABSTANDARDCASE,
  WebIFC.IFCBEAM,
  WebIFC.IFCBEAMSTANDARDCASE,
  WebIFC.IFCCOLUMN,
  WebIFC.IFCCOLUMNSTANDARDCASE,
  WebIFC.IFCROOF,
  WebIFC.IFCSTAIR,
  WebIFC.IFCSTAIRFLIGHT,
  WebIFC.IFCBUILDINGELEMENTPROXY,
  WebIFC.IFCSPACE,
  WebIFC.IFCOPENINGELEMENT,
  WebIFC.IFCOPENINGSTANDARDCASE,
];

const TYPE_ID_TO_LABEL = new Map<number, string>([
  [WebIFC.IFCPROJECT, 'IfcProject'],
  [WebIFC.IFCSITE, 'IfcSite'],
  [WebIFC.IFCBUILDING, 'IfcBuilding'],
  [WebIFC.IFCBUILDINGSTOREY, 'IfcBuildingStorey'],
  [WebIFC.IFCWALL, 'IfcWall'],
  [WebIFC.IFCWALLSTANDARDCASE, 'IfcWallStandardCase'],
  [WebIFC.IFCWALLELEMENTEDCASE, 'IfcWallElementedCase'],
  [WebIFC.IFCDOOR, 'IfcDoor'],
  [WebIFC.IFCDOORSTANDARDCASE, 'IfcDoorStandardCase'],
  [WebIFC.IFCWINDOW, 'IfcWindow'],
  [WebIFC.IFCWINDOWSTANDARDCASE, 'IfcWindowStandardCase'],
  [WebIFC.IFCSLAB, 'IfcSlab'],
  [WebIFC.IFCSLABSTANDARDCASE, 'IfcSlabStandardCase'],
  [WebIFC.IFCBEAM, 'IfcBeam'],
  [WebIFC.IFCBEAMSTANDARDCASE, 'IfcBeamStandardCase'],
  [WebIFC.IFCCOLUMN, 'IfcColumn'],
  [WebIFC.IFCCOLUMNSTANDARDCASE, 'IfcColumnStandardCase'],
  [WebIFC.IFCROOF, 'IfcRoof'],
  [WebIFC.IFCSTAIR, 'IfcStair'],
  [WebIFC.IFCSTAIRFLIGHT, 'IfcStairFlight'],
  [WebIFC.IFCBUILDINGELEMENTPROXY, 'IfcBuildingElementProxy'],
  [WebIFC.IFCSPACE, 'IfcSpace'],
  [WebIFC.IFCOPENINGELEMENT, 'IfcOpeningElement'],
  [WebIFC.IFCOPENINGSTANDARDCASE, 'IfcOpeningStandardCase'],
]);

function unwrapLabel(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && 'value' in v) {
    const val = (v as { value: unknown }).value;
    if (typeof val === 'string') return val;
  }
  return undefined;
}

function lineTypeLabel(typeId: number): string {
  return TYPE_ID_TO_LABEL.get(typeId) ?? `IfcType_${typeId}`;
}

function expressIdFromRef(val: unknown): string | undefined {
  if (typeof val === 'number' && val > 0) return String(val);
  if (val && typeof val === 'object' && 'expressID' in val) {
    const id = (val as { expressID: unknown }).expressID;
    if (typeof id === 'number' && id > 0) return String(id);
  }
  return undefined;
}

function nodeFromLine(expressId: string, typeId: number, line: Record<string, unknown>): GraphNode {
  const name = unwrapLabel(line.Name);
  const globalId = unwrapLabel(line.GlobalId);
  return {
    id: expressId,
    type: lineTypeLabel(typeId),
    name: name ?? globalId,
    properties: {
      globalId,
      description: unwrapLabel(line.Description),
      objectType: unwrapLabel(line.ObjectType),
      tag: unwrapLabel(line.Tag),
    },
  };
}

let ifcApiSingleton: Promise<IfcAPI> | null = null;

function getIfcApi(): Promise<IfcAPI> {
  if (!ifcApiSingleton) {
    ifcApiSingleton = (async () => {
      const api = new IfcAPI();
      await api.Init(undefined, true);
      return api;
    })();
  }
  return ifcApiSingleton;
}

/**
 * Parse IFC bytes into graph nodes (selected products) and edges (spatial containment + aggregates).
 */
export async function extractGraphFromIfc(buffer: Buffer): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const api = await getIfcApi();
  const data = new Uint8Array(buffer);
  const modelID = api.OpenModel(data);
  if (modelID < 0) {
    throw new Error('web-ifc could not open the IFC model (invalid or unsupported file)');
  }

  try {
    const nodeById = new Map<string, GraphNode>();
    const seen = new Set<number>();

    for (const typeId of PRODUCT_TYPE_IDS) {
      const vec = api.GetLineIDsWithType(modelID, typeId, true);
      for (let i = 0; i < vec.size(); i++) {
        const eid = vec.get(i);
        if (seen.has(eid)) continue;
        seen.add(eid);
        try {
          const line = api.GetLine(modelID, eid, true) as Record<string, unknown>;
          const tid = typeof line.type === 'number' ? line.type : typeId;
          const idStr = String(eid);
          nodeById.set(idStr, nodeFromLine(idStr, tid, line));
        } catch {
          /* skip malformed line */
        }
      }
    }

    const edges: GraphEdge[] = [];

    const containedVec = api.GetLineIDsWithType(modelID, WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE, true);
    for (let i = 0; i < containedVec.size(); i++) {
      try {
        const line = api.GetLine(modelID, containedVec.get(i), true) as Record<string, unknown>;
        const spatial = expressIdFromRef(line.RelatingStructure);
        const related = line.RelatedElements;
        if (!spatial || !Array.isArray(related)) continue;
        for (const el of related) {
          const tgt = expressIdFromRef(el);
          if (tgt) edges.push({ source: spatial, target: tgt, relationship: 'CONTAINS_ELEMENT' });
        }
      } catch {
        /* skip */
      }
    }

    const aggVec = api.GetLineIDsWithType(modelID, WebIFC.IFCRELAGGREGATES, true);
    for (let i = 0; i < aggVec.size(); i++) {
      try {
        const line = api.GetLine(modelID, aggVec.get(i), true) as Record<string, unknown>;
        const parent = expressIdFromRef(line.RelatingObject);
        const related = line.RelatedObjects;
        if (!parent || !Array.isArray(related)) continue;
        for (const el of related) {
          const child = expressIdFromRef(el);
          if (child) edges.push({ source: parent, target: child, relationship: 'AGGREGATES' });
        }
      } catch {
        /* skip */
      }
    }

    return { nodes: [...nodeById.values()], edges };
  } finally {
    api.CloseModel(modelID);
  }
}
