# Construction IFC Tools

建設業界向けのIFC（Industry Foundation Classes）ファイル統合管理・3D可視化・AI分析ソリューション。

> **AWS 上のインフラ（CDK）は 🚧 工事中です。**  
> `packages/infrastructure` のスタック設計・リソース配線・本番デプロイ手順はまだ確定していません。S3 / DynamoDB / API Gateway / Lambda / Cognito / Bedrock / Neptune などへの実装は進行中で、**現時点ではローカル Mock モードでの開発・検証を主**にしてください。AWS に載せたい場合は CDK コードと AWS アカウント側の前提を自分で確認したうえで扱ってください。

## インフラ・デプロイの状態

| 対象 | 状態 | メモ |
|------|------|------|
| ローカル（Mock / `MOCK_AWS=true`） | 利用可 | 下記 Getting Started。AWS 通信なし。 |
| AWS（`packages/infrastructure` / CDK） | 🚧 工事中 | スタック・デプロイは未完成。`cdk synth` / `cdk deploy` は自己責任。 |

## 機能概要

| Phase | 機能 | 状態 |
|-------|------|------|
| Phase 1 | IFCファイル管理 (Upload/List/Rename/Delete) | ✅ Mock/ローカル対応 |
| Phase 2 | 3D Viewer（That Open + 検索連動表示） | ✅ Mock/ローカル対応 |
| Phase 3 | AI IFC生成（本番: Bedrock / ローカル: Ollama 想定） | 🚧 Mock 固定 IFC のみ（Ollama アダプタは未接続） |
| Phase 4 | GraphDB化 + AI Q&A (Neptune + Bedrock) | 🚧 スケルトン (Optional) |

### Phase 2（3D Viewer）でできること

- **File Manager で選んだ IFC** を Viewer で読み込み（`GET /api/files/:id/download`）。
- **カメラ**: 左ドラッグでオービット、ホイールでズーム（`@thatopen/components` + CameraControls）。
- **IFC タイプ名の部分一致検索** → ヒット一覧（ページング・文字絞り込み）と **IFC 種別ごとのチェック**で、3D を **絞り込み表示** または **全体のままハイライト**。
- **web-ifc WASM** は `predev` / `prebuild` で `public/web-ifc/` にコピー（`packages/frontend/scripts/copy-web-ifc-wasm.mjs`）。

階層ツリーによるナビゲーションや GraphDB 連携は **Phase 4** 以降の想定。

### Phase 3（AI IFC 生成）の進め方

| モード | 内容 | 状態 |
|--------|------|------|
| **Mock** | `POST /api/ai/generate` はプロンプトに関わらず **固定のミニ IFC** を返し、ストレージに保存する | ✅ 利用可 |
| **Ollama（ローカル LLM）** | 同一 API で **実生成**するための環境。バックエンドの `AiPort` に Ollama 実装を差し込む | 🚧 環境は README 手順で用意可／**コード未接続** |
| **Bedrock** | Claude 4.5 Sonnet（本番想定） | 🚧 未配線 |

先に **Ollama を入れておき**、続く実装で `USE_LOCAL_LLM` 等から切り替えられるようにする想定です。

## アーキテクチャ

```
packages/
├── shared/          # Zodスキーマ & 型定義 (Frontend/Backend共有)
├── backend/         # Hono API (Lambda / Local Node Server)
│   ├── adapters/    # Ports & Adapters (StoragePort, MetadataDbPort, AiPort, GraphPort)
│   └── api/         # ドメイン別ルート (files, ai-generate, graph-qa)
├── frontend/        # React + Vite + Cloudscape Design System
│   ├── pages/       # FileManager, Viewer, AiGenerate, GraphQA
│   ├── components/  # Layout, ifc/IfcViewerCanvas など
│   └── api/         # Hono RPC Client (End-to-End Type Safety)
└── infrastructure/  # AWS CDK（🚧 本番スタックは工事中）
```

### 技術スタック

| 層 | 技術 |
|---|---|
| Frontend | React + Vite + Cloudscape + react-router-dom |
| Backend | Hono (Lambda / @hono/node-server) |
| IFC Parser | web-ifc (WASM) |
| 3D Rendering | @thatopen/components + @thatopen/fragments + Three.js |
| AI | Bedrock Claude 4.5 Sonnet / Ollama (Optional Local) |
| GraphDB | Neptune Serverless / Local JSON (Mock) |
| IaC | AWS CDK (TypeScript) ※スタックは工事中 |
| テスト | Vitest (App) / Jest (CDK) |
| 型安全 | Hono RPC + Zod |

## Getting Started（ローカル開発）

### 前提条件
* [Node.js](https://nodejs.org/) (>= v20)
* npm (>= v10)

### セットアップ
```bash
git clone https://github.com/kazu8854/construction-ifc-tools.git
cd construction-ifc-tools
npm install
```

### ローカル起動（Mockモード）

**Viewer で IFC を開くには、バックエンドとフロントの両方が必要です**（一覧 API とファイルダウンロード API）。

```bash
# ターミナル1: バックエンド (http://localhost:3001)
npm run dev:mock -w packages/backend

# ターミナル2: フロントエンド (http://localhost:5173)
npm run dev:mock -w packages/frontend
```

環境変数 `MOCK_AWS=true` / `VITE_MOCK_AWS=true` が自動設定されます。  
AWSリソースへの通信は一切発生しません。

**API の向き先（フロント）**

| 状況 | 挙動 |
|------|------|
| `VITE_MOCK_AWS=true`（`dev:mock`） | `BACKEND_URL` → `http://localhost:3001`（CORS 直叩き） |
| `dev` のみ（Mock なし） | 相対 `/api/*` → Vite proxy が 3001 へ転送（`vite.config.ts`） |
| `VITE_API_URL` 指定 | その URL を最優先 |

### Mock時のデータ永続化
Mockモードでは以下にデータが永続化されます（プロセス再起動後もデータは残ります）：

| データ種別 | 保存先 |
|---|---|
| IFCファイル本体 | `./mock-storage/ifc/` |
| メタデータ (CSV) | `./mock-storage/metadata.csv` |
| GraphDBデータ (JSON) | `./mock-storage/graphs/` |

### テスト
```bash
# 全ワークスペースのテストを実行
npm run test

# カバレッジレポート付き
npm run test:coverage -w packages/backend
npm run test:coverage -w packages/frontend
```

## Ollama の導入（Phase 3・ローカル LLM 検証用）

[Ollama](https://ollama.com/) は LLM を **ローカルの HTTP API**（既定 `http://127.0.0.1:11434`）として動かすツールです。AWS Bedrock なしで **生成品質の試行**や **プロンプト設計**をしたいときに使います。

> **現状のコード**: `POST /api/ai/generate` は **Mock の固定 IFC** のみです。環境変数 `USE_LOCAL_LLM` は **バックエンドにまだ配線されていません**（Ollama 用 `AiPort` 実装は Phase 3 の続き）。以下は **先に環境だけ整える**ための手順です。

### 1. インストール

| 環境 | 手順 |
|------|------|
| **公式ダウンロード** | https://ollama.com/download（Windows / macOS / Linux インストーラ） |
| **Linux / WSL** | `curl -fsSL https://ollama.com/install.sh \| sh` |
| **macOS（Homebrew）** | `brew install ollama` |

### 2. サービス起動

インストール直後は多くの環境で **バックグラウンド起動**されます。応答がない場合は別ターミナルで:

```bash
ollama serve
```

### 3. モデル取得

```bash
# 比較的軽量（README従来の例）
ollama pull llama3.2

# STEP のような構造化テキスト生成を試す場合の例（任意・マシンスペックに応じて）
# ollama pull qwen2.5-coder:7b
# ollama pull codellama
```

### 4. 動作確認

```bash
curl -s http://127.0.0.1:11434/api/tags
# 対話テスト: ollama run llama3.2 "Hello"
```

### 5. 生成 API（HTTP）の簡易テスト

```bash
curl -s http://127.0.0.1:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Say one sentence about IFC.",
  "stream": false
}' -H "Content-Type: application/json"
```

### 6. バックエンド連携（予定）

- **想定環境変数**: `USE_LOCAL_LLM=true`、必要なら `OLLAMA_HOST`（既定 `http://127.0.0.1:11434`）、`OLLAMA_MODEL`（例: `llama3.2`）
- **想定起動例**（アダプタ実装後）:

```bash
USE_LOCAL_LLM=true MOCK_AWS=true npm run dev:mock -w packages/backend
```

本番品質・長文 STEP の安定性は **Bedrock Claude 4.5 Sonnet** 側が有利な想定です。Ollama は **オフライン検証と開発速度**向けです。

## Future Enhancements

### 大容量IFCファイル対応
現在はAPI Gateway (Lambda統合) 経由でのアップロード（~10MB上限）をサポートしています。
100MB以上のIFCファイルを扱う場合は、**S3 Presigned URL** を用いたダイレクトアップロード方式への移行が必要です。

```
1. Frontend → Backend: POST /api/files/presign → Presigned URL取得
2. Frontend → S3: PUT (Presigned URL) でダイレクトアップロード
3. S3 Event → Lambda: メタデータ登録 & 後処理
```

### Neptune Serverless コスト管理
Neptune Serverlessは最小1 NCUで月額 ~$117 のコスト。
必要な時だけ起動する運用を推奨します：

1. `POST /api/graph/convert` でIFCをGraphDB化
2. 分析・Q&A完了後、`GET /api/graph/export/:fileId` でS3にJSON Export
3. Neptuneクラスターを停止/削除
4. 再利用時はS3からImport

## ライセンス
MIT
