import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';

// === Phase 2: 3D Viewer ===
// TODO: Implement IFC 3D Viewer
// - web-ifc WASM parser + @thatopen/components + Three.js
// - OrbitControls (rotate, zoom, pan)
// - Element search by IFC type (autocomplete)
// - Highlight selected elements in 3D scene
// - Property panel for selected element details

export function Viewer() {
  return (
    <ContentLayout header={<Header variant="h1" description="IFCファイルの3D表示・要素検索・ハイライト">3D Viewer</Header>}>
      <Container header={<Header variant="h2">IFC 3D Viewer</Header>}>
        <p>🚧 Phase 2: 3Dビューワー機能を実装予定</p>
        <p>Libraries: <code>web-ifc</code> + <code>@thatopen/components</code> + <code>Three.js</code></p>
        <div id="ifc-viewer-container" style={{ width: '100%', height: '600px', background: '#1a1a2e', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          3D Viewer Canvas will render here
        </div>
      </Container>
    </ContentLayout>
  );
}
