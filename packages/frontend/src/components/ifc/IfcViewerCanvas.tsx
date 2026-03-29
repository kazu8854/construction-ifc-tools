import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';
import * as THREE from 'three';
import Box from '@cloudscape-design/components/box';
import Spinner from '@cloudscape-design/components/spinner';
import { BACKEND_URL } from '../../api/client';
import fragmentsWorkerUrl from '@thatopen/fragments/worker?url';

function webIfcWasmBaseUrl(): string {
  const base = import.meta.env.BASE_URL;
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  if (typeof window === 'undefined') return `${prefix}/web-ifc/`;
  const origin = window.location.origin;
  return `${origin}${prefix}/web-ifc/`;
}

export type SearchDisplayMode = 'isolate' | 'highlight';

export type IfcSearchResultRow = {
  key: string;
  modelId: string;
  localId: number;
  /** ItemsFinder / fragment 属性から推定した IFC カテゴリ（一覧グループ用） */
  ifcCategory: string;
  overview: string;
};

export type IfcViewerHandle = {
  /** IFC タイプで検索し、直近結果をエンジン内に保持。3D 反映は applySearchDisplay で行う */
  findByIfcType: (ifcType: string) => Promise<{ rows: IfcSearchResultRow[]; count: number }>;
  /** 直近の検索結果に対して絞り込み or 全体表示のままハイライト */
  applySearchDisplay: (mode: SearchDisplayMode) => Promise<void>;
  /** 検索ヒットのうち指定行だけを 3D に反映（種別チェック・一覧絞り込み後用） */
  applyRowSubset: (
    mode: SearchDisplayMode,
    rows: ReadonlyArray<Pick<IfcSearchResultRow, 'modelId' | 'localId'>>,
  ) => Promise<void>;
  /** 絞り込み・検索ハイライトをリセット */
  resetFilter: () => Promise<void>;
};

function countModelIdMap(map: OBC.ModelIdMap): number {
  let n = 0;
  for (const s of Object.values(map)) n += s.size;
  return n;
}

type EngineApi = {
  loadIfc: (data: Uint8Array, modelName: string) => Promise<void>;
  findByCategory: (re: RegExp) => Promise<{ rows: IfcSearchResultRow[]; count: number }>;
  applySearchDisplay: (mode: SearchDisplayMode) => Promise<void>;
  applyRowSubset: (
    mode: SearchDisplayMode,
    rows: ReadonlyArray<Pick<IfcSearchResultRow, 'modelId' | 'localId'>>,
  ) => Promise<void>;
  resetFilter: () => Promise<void>;
  dispose: () => void;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function attrString(item: FRAGS.ItemData | undefined, key: string): string | null {
  if (!item) return null;
  const v = item[key];
  if (v && typeof v === 'object' && v !== null && 'value' in v) {
    const val = (v as { value: unknown }).value;
    if (val != null && String(val).trim()) return String(val).slice(0, 120);
  }
  return null;
}

function rawAttrString(item: FRAGS.ItemData | undefined, key: string): string | null {
  if (!item) return null;
  const v = item[key];
  if (v && typeof v === 'object' && v !== null && 'value' in v) {
    const val = (v as { value: unknown }).value;
    if (val != null && String(val).trim()) return String(val);
  }
  return null;
}

/** fragment ItemData から IFC カテゴリらしき文字列を取得 */
function extractIfcCategory(item: FRAGS.ItemData | undefined): string {
  if (!item) return '（不明）';
  return (
    rawAttrString(item, 'category') ??
    rawAttrString(item, 'Category') ??
    rawAttrString(item, '_category') ??
    rawAttrString(item, 'type') ??
    rawAttrString(item, 'Type') ??
    '（不明）'
  );
}

/** 大量行でも軽い一覧用テキスト（フル JSON は避ける） */
function formatItemOverviewShort(
  item: FRAGS.ItemData | undefined,
  category: string,
  localId: number,
): string {
  if (!item) return `${category} · #${localId}`;
  const name = attrString(item, 'Name') ?? attrString(item, 'name');
  const gid = attrString(item, 'GlobalId') ?? attrString(item, 'globalId');
  const bits = [name, gid].filter(Boolean);
  return bits.length ? `${category} · ${bits.join(' · ')}` : `${category} · #${localId}`;
}

function rowRefsToModelIdMap(
  rows: ReadonlyArray<Pick<IfcSearchResultRow, 'modelId' | 'localId'>>,
): OBC.ModelIdMap {
  const m: OBC.ModelIdMap = {};
  for (const r of rows) {
    if (!m[r.modelId]) m[r.modelId] = new Set();
    m[r.modelId].add(r.localId);
  }
  return m;
}

async function buildSearchRows(
  fragments: OBC.FragmentsManager,
  map: OBC.ModelIdMap,
): Promise<IfcSearchResultRow[]> {
  const rows: IfcSearchResultRow[] = [];
  if (countModelIdMap(map) === 0) return rows;

  const data = await fragments.getData(map);

  for (const [modelId, idSet] of Object.entries(map)) {
    const sortedIds = [...idSet].sort((a, b) => a - b);
    const arr = data[modelId] ?? [];
    if (arr.length === sortedIds.length) {
      sortedIds.forEach((localId, i) => {
        const item = arr[i];
        const cat = extractIfcCategory(item);
        rows.push({
          key: `${modelId}:${localId}`,
          modelId,
          localId,
          ifcCategory: cat,
          overview: formatItemOverviewShort(item, cat, localId),
        });
      });
    } else {
      for (const localId of sortedIds) {
        const one = await fragments.getData({ [modelId]: new Set([localId]) });
        const item = one[modelId]?.[0];
        const cat = extractIfcCategory(item);
        rows.push({
          key: `${modelId}:${localId}`,
          modelId,
          localId,
          ifcCategory: cat,
          overview: formatItemOverviewShort(item, cat, localId),
        });
      }
    }
  }

  rows.sort((a, b) => a.localId - b.localId);
  return rows;
}

async function createEngine(container: HTMLElement): Promise<EngineApi> {
  const components = new OBC.Components();
  const worlds = components.get(OBC.Worlds);
  const world = worlds.create<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBC.SimpleRenderer>();

  world.scene = new OBC.SimpleScene(components);
  world.scene.setup();
  world.scene.three.background = null;

  world.renderer = new OBC.SimpleRenderer(components, container);
  world.camera = new OBC.OrthoPerspectiveCamera(components);
  await world.camera.controls.setLookAt(12, 12, 12, 0, 0, 0);

  components.init();
  components.get(OBC.Grids).create(world);

  const fragments = components.get(OBC.FragmentsManager);
  fragments.init(fragmentsWorkerUrl);

  world.camera.controls.addEventListener('update', () => {
    fragments.core.update();
  });

  fragments.list.onItemSet.add(({ value: model }) => {
    model.useCamera(world.camera.three);
    world.scene.three.add(model.object);
    fragments.core.update(true);
  });

  fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
    if (!('isLodMaterial' in material && material.isLodMaterial)) {
      material.polygonOffset = true;
      material.polygonOffsetUnits = 1;
      material.polygonOffsetFactor = Math.random();
    }
  });

  const ifcLoader = components.get(OBC.IfcLoader);
  await ifcLoader.setup({
    autoSetWasm: false,
    wasm: {
      path: webIfcWasmBaseUrl(),
      absolute: true,
    },
  });

  const itemsFinder = components.get(OBC.ItemsFinder);
  const hider = components.get(OBC.Hider);

  const highlightStyle: FRAGS.MaterialDefinition = {
    color: new THREE.Color(1, 0.82, 0.15),
    renderedFaces: FRAGS.RenderedFaces.TWO,
    opacity: 1,
    transparent: false,
  };

  let lastSearchMap: OBC.ModelIdMap = {};

  /**
   * Hider/highlight 直後のみだと、カメラを動かすまでシーンが更新されないことがある。
   * renderer の再描画フラグ・controls.update（既存の core.update リスナー）・次フレームの core で同期を固める。
   */
  async function bumpFragmentVisualSync() {
    world.renderer.needsUpdate = true;
    void fragments.core.update();
    world.camera.controls.update(1 / 60);
    await fragments.core.update(true);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        void fragments.core.update(true).finally(() => {
          world.renderer.needsUpdate = true;
          resolve();
        });
      });
    });
  }

  async function applyMapToScene(mode: SearchDisplayMode, map: OBC.ModelIdMap) {
    await fragments.resetHighlight();
    const c = countModelIdMap(map);
    if (c === 0) {
      await hider.set(true);
      await bumpFragmentVisualSync();
      return;
    }
    if (mode === 'isolate') {
      await hider.isolate(map);
    } else {
      await hider.set(true);
      await fragments.highlight(highlightStyle, map);
    }
    await fragments.core.update(true);
    await bumpFragmentVisualSync();
  }

  return {
    async loadIfc(data, modelName) {
      lastSearchMap = {};
      try {
        await ifcLoader.load(data, true, modelName);
      } catch (e) {
        const hint =
          ' 3D 形状表現（押出し・テッセレーション等）が無い IFC や、不正な STEP ではビューアが空になることがあります。';
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`IFC の解析に失敗しました: ${msg}.${hint}`);
      }
      requestAnimationFrame(() => {
        void world.camera.fitToItems();
      });
    },
    async findByCategory(re) {
      lastSearchMap = await itemsFinder.getItems([{ categories: [re] }]);
      const count = countModelIdMap(lastSearchMap);
      const rows = await buildSearchRows(fragments, lastSearchMap);
      return { rows, count };
    },
    async applySearchDisplay(mode: SearchDisplayMode) {
      await applyMapToScene(mode, lastSearchMap);
    },
    async applyRowSubset(mode, rowRefs) {
      const map = rowRefsToModelIdMap(rowRefs);
      await applyMapToScene(mode, map);
    },
    async resetFilter() {
      lastSearchMap = {};
      await fragments.resetHighlight();
      await hider.set(true);
      await fragments.core.update(true);
      await bumpFragmentVisualSync();
    },
    dispose() {
      components.dispose();
    },
  };
}

export type IfcViewerCanvasProps = {
  fileId: string;
  /** 3D キャンバスの高さ（CSS）。幅は親 100% */
  canvasHeightCss?: string;
  onViewerStatus?: (status: 'loading' | 'ready' | 'error') => void;
};

const DEFAULT_CANVAS_HEIGHT = 'clamp(440px, min(62vh, 55vw), 920px)';

export const IfcViewerCanvas = forwardRef<IfcViewerHandle, IfcViewerCanvasProps>(
  function IfcViewerCanvas({ fileId, canvasHeightCss, onViewerStatus }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<EngineApi | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      async findByIfcType(ifcType: string) {
        const e = engineRef.current;
        if (!e) return { rows: [], count: 0 };
        const t = ifcType.trim();
        if (!t) return { rows: [], count: 0 };
        const re = new RegExp(escapeRegExp(t), 'i');
        return e.findByCategory(re);
      },
      async applySearchDisplay(mode: SearchDisplayMode) {
        await engineRef.current?.applySearchDisplay(mode);
      },
      async applyRowSubset(mode, rows) {
        await engineRef.current?.applyRowSubset(mode, rows);
      },
      async resetFilter() {
        await engineRef.current?.resetFilter();
      },
    }));

    useEffect(() => {
      onViewerStatus?.(status);
    }, [status, onViewerStatus]);

    const canvasHeight = canvasHeightCss ?? DEFAULT_CANVAS_HEIGHT;

    useEffect(() => {
      const el = containerRef.current;
      if (!el || !fileId) return;

      let cancelled = false;
      engineRef.current = null;
      setStatus('loading');
      setErrorMessage(null);
      el.replaceChildren();

      void (async () => {
        try {
          const engine = await createEngine(el);
          if (cancelled) {
            engine.dispose();
            return;
          }
          engineRef.current = engine;

          const res = await fetch(`${BACKEND_URL}/api/files/${fileId}/download`);
          if (!res.ok) {
            throw new Error(`IFC の取得に失敗しました (${res.status})`);
          }
          const buf = new Uint8Array(await res.arrayBuffer());
          await engine.loadIfc(buf, fileId);
          if (cancelled) {
            engine.dispose();
            return;
          }
          setStatus('ready');
        } catch (e) {
          if (!cancelled) {
            setStatus('error');
            setErrorMessage(e instanceof Error ? e.message : 'ビューワの初期化に失敗しました');
          }
        }
      })();

      return () => {
        cancelled = true;
        engineRef.current?.dispose();
        engineRef.current = null;
      };
    }, [fileId]);

    return (
      <div style={{ position: 'relative', width: '100%', minHeight: canvasHeight }}>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: canvasHeight,
            borderRadius: 8,
            overflow: 'hidden',
            background: '#0f1419',
          }}
        />
        {status === 'loading' ? (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            margin={{ top: '-22px', left: '-22px' }}
          >
            <Spinner size="large" />
          </Box>
        ) : null}
        {status === 'error' && errorMessage ? (
          <Box
            color="text-status-error"
            padding="s"
            position="absolute"
            bottom={8}
            left={8}
            right={8}
          >
            {errorMessage}
          </Box>
        ) : null}
      </div>
    );
  },
);
