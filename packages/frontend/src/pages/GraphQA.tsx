import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IfcFile } from '@construction-ifc-tools/shared';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table from '@cloudscape-design/components/table';
import Textarea from '@cloudscape-design/components/textarea';
import { client } from '../api/client';

type SummaryRow = { type: string; count: number };

export function GraphQA() {
  const [files, setFiles] = useState<IfcFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [convertBusy, setConvertBusy] = useState(false);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [nodeCount, setNodeCount] = useState<number | null>(null);
  const [edgeCount, setEdgeCount] = useState<number | null>(null);
  const [question, setQuestion] = useState('このモデルに含まれる主な要素種別を短く教えてください。');
  const [qaBusy, setQaBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const res = await client.api.files.$get();
      const body = (await res.json()) as { success: boolean; data?: IfcFile[]; error?: string };
      if (!res.ok || !body.success || !body.data) {
        setError(body.error ?? 'ファイル一覧の取得に失敗しました');
        setFiles([]);
        return;
      }
      setFiles(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ファイル一覧の取得に失敗しました');
      setFiles([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const fileOptions = useMemo(
    () =>
      files.map((f) => ({
        label: f.name,
        value: f.id,
        description: `${f.fileSize} B · ${f.source}`,
      })),
    [files],
  );

  const selectedOption = useMemo(() => {
    if (!selectedFileId) return null;
    return fileOptions.find((o) => o.value === selectedFileId) ?? null;
  }, [fileOptions, selectedFileId]);

  const summaryRows: SummaryRow[] = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  }, [summary]);

  const onConvert = async () => {
    if (!selectedFileId) return;
    setConvertBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await client.api.graph.convert[':fileId'].$post({ param: { fileId: selectedFileId } });
      const body = (await res.json()) as {
        success: boolean;
        data?: { nodeCount: number; edgeCount: number; summary: Record<string, number> };
        error?: string;
      };
      if (!res.ok || !body.success || !body.data) {
        setError(body.error ?? `変換に失敗しました (${res.status})`);
        setSummary(null);
        setNodeCount(null);
        setEdgeCount(null);
        return;
      }
      setNodeCount(body.data.nodeCount);
      setEdgeCount(body.data.edgeCount);
      setSummary(body.data.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : '変換リクエストに失敗しました');
    } finally {
      setConvertBusy(false);
    }
  };

  const onAsk = async () => {
    if (!selectedFileId || question.trim().length < 5) return;
    setQaBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await client.api.graph.qa.$post({
        json: { fileId: selectedFileId, question: question.trim() },
      });
      const body = (await res.json()) as {
        success: boolean;
        data?: { answer: string };
        error?: string;
      };
      if (!res.ok || !body.success || !body.data) {
        setError(body.error ?? `Q&A に失敗しました (${res.status})`);
        return;
      }
      setAnswer(body.data.answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Q&A リクエストに失敗しました');
    } finally {
      setQaBusy(false);
    }
  };

  useEffect(() => {
    if (!selectedFileId) {
      setSummary(null);
      setNodeCount(null);
      setEdgeCount(null);
      setAnswer(null);
      return;
    }
    void (async () => {
      const res = await client.api.graph.summary[':fileId'].$get({ param: { fileId: selectedFileId } });
      if (res.status === 404) {
        setSummary(null);
        setNodeCount(null);
        setEdgeCount(null);
        return;
      }
      const body = (await res.json()) as { success: boolean; data?: Record<string, number> };
      if (body.success && body.data) {
        setSummary(body.data);
        setNodeCount(null);
        setEdgeCount(null);
      }
    })();
  }, [selectedFileId]);

  return (
    <ContentLayout
      header={
        <Header variant="h1" description="IFC を web-ifc でグラフ化し、要約をコンテキストに AI に質問します（Mock: JSON 永続化）">
          Graph Q&amp;A
        </Header>
      }
    >
      <SpaceBetween size="l">
        {error ? <Alert type="error" header="エラー" onDismiss={() => setError(null)}>{error}</Alert> : null}

        <Container header={<Header variant="h2">1. ファイルとグラフ化</Header>}>
          <SpaceBetween size="m">
            <FormField label="IFC ファイル">
              <Select
                selectedOption={selectedOption}
                onChange={({ detail }) => {
                  const v = detail.selectedOption?.value ?? null;
                  setSelectedFileId(typeof v === 'string' ? v : null);
                }}
                options={fileOptions}
                placeholder="一覧を読み込み中…"
                loadingText="読み込み中"
                statusType={listLoading ? 'loading' : 'finished'}
                empty="ファイルがありません（File Manager からアップロード）"
              />
            </FormField>
            <Button
              variant="primary"
              disabled={!selectedFileId}
              loading={convertBusy}
              onClick={() => void onConvert()}
            >
              IFC → グラフに変換
            </Button>
            {nodeCount != null && edgeCount != null ? (
              <Box variant="p" color="text-body-secondary">
                直近の変換: ノード {nodeCount} · エッジ {edgeCount}
              </Box>
            ) : null}
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">2. 要素数サマリー（グラフがあれば表示）</Header>}>
          {summary && summaryRows.length > 0 ? (
            <Table
              columnDefinitions={[
                { id: 'type', header: 'IFC 型', cell: (item: SummaryRow) => item.type },
                { id: 'count', header: '件数', cell: (item: SummaryRow) => String(item.count) },
              ]}
              items={summaryRows}
              loading={false}
              loadingText="読み込み中"
              trackBy="type"
              header={<Header variant="h3">種別ごとの件数</Header>}
            />
          ) : (
            <Box variant="p" color="text-body-secondary">
              グラフ未作成です。上の「IFC → グラフに変換」を実行してください。
            </Box>
          )}
        </Container>

        <Container header={<Header variant="h2">3. 自然言語で質問</Header>}>
          <SpaceBetween size="m">
            <FormField label="質問" description="グラフの要約 JSON が AI に渡ります（5 文字以上）">
              <Textarea value={question} onChange={({ detail }) => setQuestion(detail.value)} rows={4} />
            </FormField>
            <Button
              variant="primary"
              disabled={!selectedFileId || question.trim().length < 5}
              loading={qaBusy}
              onClick={() => void onAsk()}
            >
              質問する
            </Button>
            {answer ? (
              <Alert type="info" header="回答">
                <Box variant="div" margin={{ top: 's' }} style={{ whiteSpace: 'pre-wrap' }}>
                  {answer}
                </Box>
              </Alert>
            ) : null}
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
