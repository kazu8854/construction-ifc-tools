import { z } from 'zod';

// === IFC Element (search result from parsed IFC data) ===
// Represents a single BIM element extracted from an IFC file via web-ifc parser.
export const IfcElementSchema = z.object({
  expressId: z.number().describe('IFC内のExpressID（一意な数値ID）'),
  type: z.string().describe('IFCタイプ名 (IfcWall, IfcDoor, IfcWindow, IfcSlab, etc.)'),
  name: z.string().optional().describe('要素の名称 (Name属性)'),
  globalId: z.string().optional().describe('IFC GlobalId (GUID)'),
  properties: z.record(z.unknown()).optional().describe('プロパティセット（Pset等）'),
});

export type IfcElement = z.infer<typeof IfcElementSchema>;

// === IFC Element Search Request ===
export const IfcSearchSchema = z.object({
  fileId: z.string().uuid().describe('検索対象のIFCファイルID'),
  query: z.string().describe('検索クエリ（IFCタイプ名 or テキスト）'),
});

export type IfcSearch = z.infer<typeof IfcSearchSchema>;

// === Available IFC Types (for autocomplete/input assist) ===
// Common IFC element types used for search assistance
export const COMMON_IFC_TYPES = [
  'IfcWall', 'IfcWallStandardCase', 'IfcDoor', 'IfcWindow',
  'IfcSlab', 'IfcBeam', 'IfcColumn', 'IfcRoof',
  'IfcStair', 'IfcRailing', 'IfcCurtainWall',
  'IfcBuildingElementProxy', 'IfcFurnishingElement',
  'IfcSpace', 'IfcBuilding', 'IfcBuildingStorey', 'IfcSite',
  'IfcOpeningElement', 'IfcPlate', 'IfcMember',
] as const;
