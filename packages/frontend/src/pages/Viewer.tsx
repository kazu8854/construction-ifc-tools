import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { IfcFile } from '@construction-ifc-tools/shared';
import { COMMON_IFC_TYPES } from '@construction-ifc-tools/shared';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Checkbox from '@cloudscape-design/components/checkbox';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Input from '@cloudscape-design/components/input';
import Pagination from '@cloudscape-design/components/pagination';
import RadioGroup from '@cloudscape-design/components/radio-group';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table from '@cloudscape-design/components/table';
import {
  IfcViewerCanvas,
  type IfcSearchResultRow,
  type IfcViewerHandle,
  type SearchDisplayMode,
} from '../components/ifc/IfcViewerCanvas';
import { client } from '../api/client';

const TABLE_PAGE_SIZE = 50;

export function Viewer() {
  const { fileId: fileIdParam } = useParams<{ fileId?: string }>();
  const navigate = useNavigate();
  const viewerRef = useRef<IfcViewerHandle>(null);
  const [files, setFiles] = useState<IfcFile[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('IfcWall');
  const [searchBusy, setSearchBusy] = useState(false);
  const [viewerStatus, setViewerStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [searchHint, setSearchHint] = useState<string | null>(null);
  const [searchRows, setSearchRows] = useState<IfcSearchResultRow[]>([]);
  const [displayMode, setDisplayMode] = useState<SearchDisplayMode>('isolate');
  /** チェックを外す = この IFC 種別を 3D から除外（一覧には残す） */
  const [disabledIfcTypes, setDisabledIfcTypes] = useState<Set<string>>(() => new Set());
  const [listFilterText, setListFilterText] = useState('');
  const [tablePageIndex, setTablePageIndex] = useState(1);

  const activeFileId = fileIdParam ?? '';

  const loadFileList = useCallback(async () => {
    setListError(null);
    try {
      const res = await client.api.files.$get();
      const body = (await res.json()) as { success: boolean; data?: IfcFile[]; error?: string };
      if (!res.ok || !body.success || !body.data) {
        setListError(body.error ?? 'ファイル一覧の取得に失敗しました');
        setFiles([]);
        return;
      }
      setFiles(body.data);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'ファイル一覧の取得に失敗しました');
      setFiles([]);
    }
  }, []);

  useEffect(() => {
    void loadFileList();
  }, [loadFileList]);

  useEffect(() => {
    setSearchHint(null);
    setSearchRows([]);
    setDisabledIfcTypes(new Set());
    setListFilterText('');
    setTablePageIndex(1);
  }, [activeFileId]);

  const categoryStats = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of searchRows) {
      m.set(r.ifcCategory, (m.get(r.ifcCategory) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [searchRows]);

  const allCategories = useMemo(() => categoryStats.map(([c]) => c), [categoryStats]);

  const textFilteredRows = useMemo(() => {
    const q = listFilterText.trim().toLowerCase();
    if (!q) return searchRows;
    return searchRows.filter(
      (r) =>
        String(r.localId).includes(q) ||
        r.ifcCategory.toLowerCase().includes(q) ||
        r.overview.toLowerCase().includes(q) ||
        r.modelId.toLowerCase().includes(q),
    );
  }, [searchRows, listFilterText]);

  const tablePagesCount = Math.max(1, Math.ceil(textFilteredRows.length / TABLE_PAGE_SIZE));

  const paginatedTableItems = useMemo(() => {
    const start = (tablePageIndex - 1) * TABLE_PAGE_SIZE;
    return textFilteredRows.slice(start, start + TABLE_PAGE_SIZE);
  }, [textFilteredRows, tablePageIndex]);

  useEffect(() => {
    setTablePageIndex(1);
  }, [listFilterText, searchRows]);

  useEffect(() => {
    if (tablePageIndex > tablePagesCount) {
      setTablePageIndex(tablePagesCount);
    }
  }, [tablePageIndex, tablePagesCount]);

  useEffect(() => {
    if (viewerStatus !== 'ready') return;
    if (searchRows.length === 0) return;
    const rowsFor3d = searchRows.filter((r) => !disabledIfcTypes.has(r.ifcCategory));
    void viewerRef.current?.applyRowSubset(displayMode, rowsFor3d);
  }, [viewerStatus, displayMode, searchRows, disabledIfcTypes]);

  const onSelectFile = (id: string) => {
    if (!id) {
      navigate('/viewer');
      return;
    }
    navigate(`/viewer/${id}`);
  };

  const onSearch = async () => {
    if (!searchText.trim()) return;
    if (viewerStatus !== 'ready') {
      setSearchHint('モデルの読み込み完了後に検索してください。');
      return;
    }
    setSearchBusy(true);
    setSearchHint(null);
    try {
      const result = await viewerRef.current?.findByIfcType(searchText.trim());
      if (!result) {
        setSearchRows([]);
        setDisabledIfcTypes(new Set());
        setSearchHint('ビューワが未初期化です。');
        return;
      }
      const { rows, count } = result;
      if (count === 0) {
        setSearchRows([]);
        setDisabledIfcTypes(new Set());
        setListFilterText('');
        setTablePageIndex(1);
        await viewerRef.current?.resetFilter();
        setSearchHint(
          '該当する要素がありません。表示はすべてに戻しました。別の IFC タイプ名や Wall / Slab など短い文字列も試してください。',
        );
        return;
      }
      setSearchRows(rows);
      setDisabledIfcTypes(new Set());
      setListFilterText('');
      setTablePageIndex(1);
      if (displayMode === 'isolate') {
        setSearchHint(
          `${count} 件を一覧に表示し、下の種別チェックで 3D を調整できます（ページングは一覧のみ）。該当のみ表示（絞り込み）モードです。`,
        );
      } else {
        setSearchHint(
          `${count} 件を一覧に表示し、種別チェックでハイライト対象を切り替えられます。全体表示のままハイライトモードです。`,
        );
      }
    } finally {
      setSearchBusy(false);
    }
  };

  const onClear = async () => {
    setSearchHint(null);
    setSearchRows([]);
    setDisabledIfcTypes(new Set());
    setListFilterText('');
    setTablePageIndex(1);
    await viewerRef.current?.resetFilter();
  };

  const onDisplayModeChange = ({ detail }: { detail: { value: string } }) => {
    setDisplayMode(detail.value as SearchDisplayMode);
  };

  const toggleCategoryDisabled = (category: string, checked: boolean) => {
    setDisabledIfcTypes((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const searchTableColumns = useMemo(
    () => [
      {
        id: 'localId',
        header: 'localId',
        cell: (item: IfcSearchResultRow) => item.localId,
        width: 88,
      },
      {
        id: 'ifcCategory',
        header: 'IFC種別',
        cell: (item: IfcSearchResultRow) => (
          <span style={{ wordBreak: 'break-all' as const }} title={item.ifcCategory}>
            {item.ifcCategory.length > 28 ? `${item.ifcCategory.slice(0, 28)}…` : item.ifcCategory}
          </span>
        ),
        width: 140,
      },
      {
        id: 'model',
        header: 'モデル',
        cell: (item: IfcSearchResultRow) =>
          item.modelId.length > 10 ? `${item.modelId.slice(0, 10)}…` : item.modelId,
        width: 100,
      },
      {
        id: 'overview',
        header: '概要',
        cell: (item: IfcSearchResultRow) => (
          <span style={{ wordBreak: 'break-all' as const }} title={item.overview}>
            {item.overview.length > 72 ? `${item.overview.slice(0, 72)}…` : item.overview}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="シーンはオービットとズームが主な操作です。検索結果は種別チェックで 3D の絞り込み・ハイライトに反映し、一覧で参照できます。"
        >
          3D Viewer
        </Header>
      }
    >
      <SpaceBetween size="l">
        {listError ? (
          <Alert type="error" dismissible onDismiss={() => setListError(null)}>
            {listError}
          </Alert>
        ) : null}

        <Container
          header={
            <Header variant="h2" actions={<Button onClick={() => void loadFileList()}>一覧を再取得</Button>}>
              表示するIFCファイル
            </Header>
          }
        >
          <FormField label="ファイル">
            <select
              aria-label="IFCファイルを選択"
              value={activeFileId}
              onChange={(e) => onSelectFile(e.target.value)}
              style={{ minWidth: 280, padding: '6px 8px' }}
            >
              <option value="">— 選択してください —</option>
              {files.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </FormField>
          <Box color="text-body-secondary" margin={{ top: 'xs' }}>
            File Manager でアップロードしたファイルがここに表示されます。未選択の場合は下のビューワは読み込みません。
          </Box>
        </Container>

        {activeFileId ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 420px)',
              gap: 24,
              width: '100%',
              alignItems: 'start',
            }}
          >
            <div style={{ minWidth: 0, width: '100%' }}>
              <Container header={<Header variant="h2">シーン</Header>}>
                <IfcViewerCanvas
                  key={activeFileId}
                  ref={viewerRef}
                  fileId={activeFileId}
                  onViewerStatus={setViewerStatus}
                />
                <Box color="text-body-secondary" margin={{ top: 's' }}>
                  左ドラッグでオービット、ホイールでズーム。
                </Box>
              </Container>
            </div>
            <div
              style={{
                minWidth: 0,
                width: '100%',
                maxHeight: 'calc(100vh - 14rem)',
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              <Container header={<Header variant="h2">検索 / 一覧</Header>}>
                <SpaceBetween size="m">
                  <FormField
                    label="IFC タイプ名（部分一致）"
                    description={`カテゴリ文字列に含まれるかで判定します。例: ${COMMON_IFC_TYPES.slice(0, 4).join(', ')} や Wall`}
                  >
                    <Input
                      value={searchText}
                      onChange={({ detail }) => setSearchText(detail.value)}
                      placeholder="IfcWall"
                      disabled={viewerStatus !== 'ready'}
                    />
                  </FormField>
                  <FormField
                    label="検索後の 3D 表示"
                    description="種別チェックで実際にシーンに出す集合を変えられます（一覧の文字絞り込みは表示のみ）。"
                  >
                    <RadioGroup
                      value={displayMode}
                      onChange={onDisplayModeChange}
                      items={[
                        {
                          value: 'isolate',
                          label: '該当のみ表示（絞り込み）',
                          description: 'チェック済み種別のヒットだけを残し、他は非表示にします。',
                        },
                        {
                          value: 'highlight',
                          label: '全体表示のままハイライト',
                          description: 'モデル全体を表示したまま、チェック済み種別のヒットを強調します。',
                        },
                      ]}
                    />
                  </FormField>
                  {searchHint ? (
                    <Box
                      fontSize="body-s"
                      color={searchHint.includes('該当') ? 'text-status-warning' : 'text-body-secondary'}
                    >
                      {searchHint}
                    </Box>
                  ) : null}
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button
                      variant="primary"
                      loading={searchBusy}
                      disabled={viewerStatus !== 'ready'}
                      onClick={() => void onSearch()}
                    >
                      タイプで検索
                    </Button>
                    <Button disabled={viewerStatus !== 'ready'} onClick={() => void onClear()}>
                      絞り込み解除
                    </Button>
                  </SpaceBetween>
                </SpaceBetween>
              </Container>
              {searchRows.length > 0 ? (
                <Box margin={{ top: 'm' }}>
                  <SpaceBetween size="m">
                    <ExpandableSection
                      variant="container"
                      defaultExpanded
                      headerText="IFC 種別（3D に反映）"
                      headerDescription="チェックありの種別だけがシーンに残ります。一覧は下の表で全件保持し、ページングで表示します。"
                      headerActions={
                        <SpaceBetween direction="horizontal" size="xs">
                          <Button
                            variant="link"
                            onClick={() => setDisabledIfcTypes(new Set())}
                            disabled={allCategories.length === 0}
                          >
                            種別をすべて表示
                          </Button>
                          <Button
                            variant="link"
                            onClick={() => setDisabledIfcTypes(new Set(allCategories))}
                            disabled={allCategories.length === 0}
                          >
                            種別をすべて非表示
                          </Button>
                        </SpaceBetween>
                      }
                    >
                      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                        <SpaceBetween size="xs">
                          {categoryStats.map(([cat, n]) => (
                            <Checkbox
                              key={cat}
                              checked={!disabledIfcTypes.has(cat)}
                              onChange={({ detail }) => toggleCategoryDisabled(cat, detail.checked)}
                            >
                              {cat}（{n}）
                            </Checkbox>
                          ))}
                        </SpaceBetween>
                      </div>
                    </ExpandableSection>

                    <Container
                      header={
                        <Header variant="h2" counter={`${textFilteredRows.length} / ${searchRows.length}`}>
                          検索結果一覧
                        </Header>
                      }
                    >
                      <SpaceBetween size="m">
                        <FormField
                          label="一覧をさらに絞り込み（表示のみ）"
                          description="localId・種別・概要・モデルID のいずれかに部分一致した行だけ表に出します。3D は上の種別チェックで制御します。"
                        >
                          <Input
                            value={listFilterText}
                            onChange={({ detail }) => setListFilterText(detail.value)}
                            placeholder="例: 12345 や IfcDoor"
                          />
                        </FormField>
                        <Table
                          trackBy="key"
                          columnDefinitions={searchTableColumns}
                          items={paginatedTableItems}
                          variant="embedded"
                          empty={
                            listFilterText.trim()
                              ? '条件に一致する行がありません。'
                              : '該当なし'
                          }
                          pagination={
                            textFilteredRows.length > TABLE_PAGE_SIZE ? (
                              <Pagination
                                currentPageIndex={tablePageIndex}
                                pagesCount={tablePagesCount}
                                onChange={({ detail }) => setTablePageIndex(detail.currentPageIndex)}
                                ariaLabels={{
                                  nextPageLabel: '次のページ',
                                  previousPageLabel: '前のページ',
                                  pageLabel: (pageNumber) => `ページ ${pageNumber}`,
                                  paginationLabel: '検索結果のページ送り',
                                }}
                              />
                            ) : undefined
                          }
                        />
                      </SpaceBetween>
                    </Container>
                  </SpaceBetween>
                </Box>
              ) : null}
            </div>
          </div>
        ) : null}
      </SpaceBetween>
    </ContentLayout>
  );
}
