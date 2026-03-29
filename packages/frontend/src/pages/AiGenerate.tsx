import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { IfcFile } from '@construction-ifc-tools/shared';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Textarea from '@cloudscape-design/components/textarea';
import { client } from '../api/client';

const PROMPT_MIN = 10;

export function AiGenerate() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<IfcFile | null>(null);

  const promptOk = prompt.trim().length >= PROMPT_MIN;

  const onGenerate = async () => {
    if (!promptOk) return;
    setLoading(true);
    setError(null);
    setCreated(null);
    try {
      const res = await client.api.ai.generate.$post({
        json: {
          prompt: prompt.trim(),
          ...(fileName.trim() ? { fileName: fileName.trim() } : {}),
        },
      });
      const body = (await res.json()) as {
        success: boolean;
        data?: IfcFile;
        error?: string;
      };
      if (!res.ok || !body.success || !body.data) {
        setError(body.error ?? `生成に失敗しました (${res.status})`);
        return;
      }
      setCreated(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成リクエストに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ContentLayout
      header={
        <Header variant="h1" description="自然言語から IFC を生成し、Mock ストレージに保存します（Ollama はバックエンドで USE_LOCAL_LLM=true）">
          AI IFC Generation
        </Header>
      }
    >
      <SpaceBetween size="l">
        {error ? <Alert type="error" header="エラー" onDismiss={() => setError(null)}>{error}</Alert> : null}
        {created ? (
          <Alert type="success" header="保存しました">
            <SpaceBetween size="s">
              <Box variant="span">
                {created.name}（{created.fileSize} bytes）
              </Box>
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="primary" onClick={() => navigate(`/viewer/${created.id}`)}>
                  Viewer で開く
                </Button>
                <Button variant="link" onClick={() => navigate('/files')}>
                  ファイル一覧へ
                </Button>
              </SpaceBetween>
            </SpaceBetween>
          </Alert>
        ) : null}

        <Container header={<Header variant="h2">プロンプト</Header>}>
          <SpaceBetween size="m">
            <FormField
              label="生成指示"
              description={`最低 ${PROMPT_MIN} 文字。例: 3部屋の平屋、窓2つ、ドア1つの簡単な建物を IFC2x3 で生成してください。`}
              constraintText={`${prompt.trim().length} / ${PROMPT_MIN}+ 文字`}
              errorText={prompt.length > 0 && !promptOk ? `${PROMPT_MIN} 文字以上入力してください` : undefined}
            >
              <Textarea value={prompt} onChange={({ detail }) => setPrompt(detail.value)} rows={6} />
            </FormField>
            <FormField label="ファイル名（任意）" description="省略時はタイムスタンプ付きの自動ファイル名になります。">
              <Input value={fileName} onChange={({ detail }) => setFileName(detail.value)} placeholder="my-building.ifc" />
            </FormField>
            <Button variant="primary" loading={loading} disabled={!promptOk} onClick={() => void onGenerate()}>
              生成して保存
            </Button>
          </SpaceBetween>
        </Container>

        <Box variant="p" color="text-body-secondary">
          バックエンドが Mock のときは固定サンプル IFC が返ります。Ollama を使う場合は{' '}
          <code>npm run dev:mock:ollama:qwen -w packages/backend</code>（推奨）または <code>dev:mock:ollama</code> で起動し、<code>ollama pull</code> 済みにしてください。
        </Box>
      </SpaceBetween>
    </ContentLayout>
  );
}
