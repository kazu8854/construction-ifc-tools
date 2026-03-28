import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';

// === Phase 1: File Manager ===
// TODO: Implement IFC file CRUD UI
// - File upload (drag & drop)
// - Table with file list (Cloudscape Table)
// - Rename action (inline edit or modal)
// - Delete action (with confirmation)
// - Click to open in 3D Viewer

export function FileManager() {
  return (
    <ContentLayout header={<Header variant="h1" description="IFCファイルのアップロード・一覧・名前変更・削除">File Manager</Header>}>
      <Container header={<Header variant="h2">IFC Files</Header>}>
        <p>🚧 Phase 1: ファイル管理機能を実装予定</p>
        <p>Hono RPC Client: <code>client.api.files.$get()</code></p>
      </Container>
    </ContentLayout>
  );
}
