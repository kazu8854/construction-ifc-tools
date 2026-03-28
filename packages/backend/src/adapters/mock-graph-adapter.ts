import * as fs from 'fs';
import * as path from 'path';
import type { GraphPort, GraphNode, GraphEdge } from './graph-port';

// === Mock Graph Adapter (JSON File Persistence) ===
// Persists graph data to local JSON files under `./mock-storage/graphs/`.
// Each IFC file's graph is stored as a separate JSON file.
// Performance is not optimized (linear search), but suitable for local development.

const GRAPH_DIR = path.resolve(process.cwd(), 'mock-storage', 'graphs');

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class MockGraphAdapter implements GraphPort {
  constructor() {
    if (!fs.existsSync(GRAPH_DIR)) fs.mkdirSync(GRAPH_DIR, { recursive: true });
  }

  private filePath(fileId: string): string {
    return path.join(GRAPH_DIR, `${fileId}.json`);
  }

  private readGraph(fileId: string): GraphData | null {
    const fp = this.filePath(fileId);
    if (!fs.existsSync(fp)) return null;
    return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  }

  async saveGraph(fileId: string, nodes: GraphNode[], edges: GraphEdge[]): Promise<void> {
    fs.writeFileSync(this.filePath(fileId), JSON.stringify({ nodes, edges }, null, 2));
  }

  async query(fileId: string, queryText: string): Promise<GraphData> {
    const data = this.readGraph(fileId);
    if (!data) return { nodes: [], edges: [] };

    // Simple mock query: filter nodes by type matching the query text
    const q = queryText.toLowerCase();
    const matchedNodes = data.nodes.filter(n =>
      n.type.toLowerCase().includes(q) || (n.name && n.name.toLowerCase().includes(q))
    );
    const nodeIds = new Set(matchedNodes.map(n => n.id));
    const matchedEdges = data.edges.filter(e => nodeIds.has(e.source) || nodeIds.has(e.target));
    return { nodes: matchedNodes, edges: matchedEdges };
  }

  async getSummary(fileId: string): Promise<Record<string, number>> {
    const data = this.readGraph(fileId);
    if (!data) return {};
    const summary: Record<string, number> = {};
    for (const node of data.nodes) {
      summary[node.type] = (summary[node.type] || 0) + 1;
    }
    return summary;
  }

  async deleteGraph(fileId: string): Promise<void> {
    const fp = this.filePath(fileId);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  async hasGraph(fileId: string): Promise<boolean> {
    return fs.existsSync(this.filePath(fileId));
  }

  async exportGraph(fileId: string): Promise<GraphData> {
    return this.readGraph(fileId) ?? { nodes: [], edges: [] };
  }
}
