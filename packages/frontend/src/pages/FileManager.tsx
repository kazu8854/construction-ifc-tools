import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { IfcFile } from '@construction-ifc-tools/shared';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ContentLayout from '@cloudscape-design/components/content-layout';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import Modal from '@cloudscape-design/components/modal';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table from '@cloudscape-design/components/table';
import { BACKEND_URL, client } from '../api/client';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function FileManager() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<IfcFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<IfcFile | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IfcFile | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.api.files.$get();
      const body = (await res.json()) as { success: boolean; data?: IfcFile[]; error?: string };
      if (!res.ok || !body.success || !body.data) {
        setError(body.error ?? `一覧の取得に失敗しました (${res.status})`);
        setItems([]);
        return;
      }
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '一覧の取得に失敗しました');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      setError('.ifc ファイルのみアップロードできます');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BACKEND_URL}/api/files/upload`, { method: 'POST', body: form });
      const body = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !body.success) {
        setError(body.error ?? `アップロードに失敗しました (${res.status})`);
        return;
      }
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const openRename = (f: IfcFile) => {
    setRenameTarget(f);
    setRenameValue(f.name);
  };

  const closeRename = () => {
    if (renameSaving) return;
    setRenameTarget(null);
    setRenameValue('');
  };

  const submitRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setRenameSaving(true);
    setError(null);
    try {
      const res = await client.api.files[':id'].rename.$patch({
        param: { id: renameTarget.id },
        json: { name: renameValue.trim() },
      });
      const body = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !body.success) {
        setError(body.error ?? `名前変更に失敗しました (${res.status})`);
        return;
      }
      closeRename();
      await loadFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : '名前変更に失敗しました');
    } finally {
      setRenameSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    setError(null);
    try {
      const res = await client.api.files[':id'].$delete({ param: { id: deleteTarget.id } });
      const body = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || body.success === false) {
        setError(body.error ?? `削除に失敗しました (${res.status})`);
        return;
      }
      setDeleteTarget(null);
      await loadFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました');
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="IFCファイルのアップロード・一覧・名前変更・削除"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <input
                ref={fileInputRef}
                type="file"
                accept=".ifc,.IFC"
                style={{ display: 'none' }}
                onChange={(ev) => void onFileChange(ev)}
              />
              <Button variant="primary" loading={uploading} onClick={onPickFile} disabled={uploading}>
                IFCをアップロード
              </Button>
              <Button onClick={() => void loadFiles()} loading={loading} disabled={loading}>
                再読み込み
              </Button>
            </SpaceBetween>
          }
        >
          File Manager
        </Header>
      }
    >
      <SpaceBetween size="m">
        {error ? (
          <Alert type="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        <Table
          loading={loading}
          loadingText="読み込み中"
          trackBy="id"
          columnDefinitions={[
            {
              id: 'name',
              header: '表示名',
              cell: (item) => item.name,
              isRowHeader: true,
            },
            {
              id: 'original',
              header: '元ファイル名',
              cell: (item) => item.originalName,
            },
            {
              id: 'size',
              header: 'サイズ',
              cell: (item) => formatBytes(item.fileSize),
            },
            {
              id: 'updated',
              header: '更新日時',
              cell: (item) => formatDate(item.updatedAt),
            },
            {
              id: 'actions',
              header: '操作',
              cell: (item) => (
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant="link" onClick={() => navigate(`/viewer/${item.id}`)}>
                    3D Viewer
                  </Button>
                  <Button variant="link" onClick={() => openRename(item)}>
                    名前変更
                  </Button>
                  <Button variant="link" onClick={() => setDeleteTarget(item)}>
                    削除
                  </Button>
                </SpaceBetween>
              ),
            },
          ]}
          items={items}
          empty={
            <Box textAlign="center" color="text-body-secondary" padding="l">
              まだIFCファイルがありません。「IFCをアップロード」から追加してください。
            </Box>
          }
          header={<Header counter={`(${items.length})`}>IFCファイル一覧</Header>}
        />
      </SpaceBetween>

      <Modal
        visible={!!renameTarget}
        onDismiss={closeRename}
        header="ファイル名の変更"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={closeRename} disabled={renameSaving}>
                キャンセル
              </Button>
              <Button variant="primary" onClick={() => void submitRename()} loading={renameSaving} disabled={!renameValue.trim()}>
                保存
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="表示名">
          <Input value={renameValue} onChange={({ detail }) => setRenameValue(detail.value)} />
        </FormField>
      </Modal>

      <Modal
        visible={!!deleteTarget}
        onDismiss={() => !deleteSaving && setDeleteTarget(null)}
        header="ファイルを削除"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setDeleteTarget(null)} disabled={deleteSaving}>
                キャンセル
              </Button>
              <Button variant="primary" onClick={() => void submitDelete()} loading={deleteSaving}>
                削除する
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <Box>
          「{deleteTarget?.name}」を削除します。ストレージ上のファイルとメタデータが削除されます。この操作は取り消せません。
        </Box>
      </Modal>
    </ContentLayout>
  );
}
