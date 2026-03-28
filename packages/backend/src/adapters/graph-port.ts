// === Graph Port ===
// Handles graph database operations (Neptune in production, local JSON file in mock).
// When converting IFC to graph, nodes = IFC elements, edges = relationships.
export interface GraphNode {
  id: string;
  type: string;       // e.g., 'IfcWall', 'IfcDoor'
  name?: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;     // source node ID
  target: string;     // target node ID
  relationship: string; // e.g., 'CONTAINS', 'CONNECTS_TO', 'IS_DEFINED_BY'
}

export interface GraphPort {
  /** Store graph data for an IFC file */
  saveGraph(fileId: string, nodes: GraphNode[], edges: GraphEdge[]): Promise<void>;
  /** Query graph by Cypher-like syntax or structured query */
  query(fileId: string, queryText: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
  /** Get summary statistics (node counts by type, etc.) */
  getSummary(fileId: string): Promise<Record<string, number>>;
  /** Delete graph data for a file */
  deleteGraph(fileId: string): Promise<void>;
  /** Check if graph data exists for a file */
  hasGraph(fileId: string): Promise<boolean>;
  /** Export graph data to JSON (for S3 backup / Neptune import) */
  exportGraph(fileId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
}
