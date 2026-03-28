import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';

// === Phase 3: AI IFC Generation ===
// TODO: Implement AI IFC generation UI
// - Natural language prompt input (textarea)
// - Generate button → POST /api/ai/generate
// - Progress indicator (AppSync Events in production, polling in mock)
// - Result display + link to open in Viewer
// - History of generated files

export function AiGenerate() {
  return (
    <ContentLayout header={<Header variant="h1" description="自然言語からIFCファイルをAI生成">AI IFC Generation</Header>}>
      <Container header={<Header variant="h2">プロンプト入力</Header>}>
        <p>🚧 Phase 3: AI生成機能を実装予定</p>
        <p>Model: Bedrock Claude 4.5 Sonnet (本番) / Mock or Ollama (ローカル)</p>
        <p>例: 「3部屋の平屋、窓2つ、ドア1つの簡単な建物を生成してください」</p>
      </Container>
    </ContentLayout>
  );
}
