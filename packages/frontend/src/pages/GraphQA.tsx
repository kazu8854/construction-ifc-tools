import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';

// === Phase 4: Graph Q&A (Optional) ===
// TODO: Implement Graph DB Q&A UI
// - File selector (choose which IFC to query)
// - "Convert to Graph" button → POST /api/graph/convert/:fileId
// - Graph summary display (element counts by type)
// - Natural language question input
// - AI answer display with source references
// - Export graph data button

export function GraphQA() {
  return (
    <ContentLayout header={<Header variant="h1" description="GraphDB化されたIFCデータへの自然言語Q&A">Graph Q&A</Header>}>
      <Container header={<Header variant="h2">Graph Database Q&A</Header>}>
        <p>🚧 Phase 4 (Optional): GraphDB Q&A機能を実装予定</p>
        <p>Backend: Neptune Serverless (本番) / JSON File (Mock)</p>
        <p>例: 「この建物には窓がいくつありますか？」「1階にある壁の素材を教えてください」</p>
      </Container>
    </ContentLayout>
  );
}
