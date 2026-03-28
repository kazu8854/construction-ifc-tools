import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import SpaceBetween from '@cloudscape-design/components/space-between';

export function Dashboard() {
  return (
    <ContentLayout header={<Header variant="h1" description="IFCファイル管理・3D可視化・AI分析ソリューション">Construction IFC Tools</Header>}>
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">概要</Header>}>
          <p>IFC (Industry Foundation Classes) ファイルの統合管理、3Dビューワー、AI生成・分析機能を提供します。</p>
          <p>左のナビゲーションから各機能にアクセスしてください。</p>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
