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
| Phase 2 | 3D Viewer (web-ifc + Three.js + 要素検索/ハイライト) | 🚧 スケルトン |
| Phase 3 | AI IFC生成 (Bedrock Claude 4.5 Sonnet) | 🚧 スケルトン |
| Phase 4 | GraphDB化 + AI Q&A (Neptune + Bedrock) | 🚧 スケルトン (Optional) |

## アーキテクチャ

```
packages/
├── shared/          # Zodスキーマ & 型定義 (Frontend/Backend共有)
├── backend/         # Hono API (Lambda / Local Node Server)
│   ├── adapters/    # Ports & Adapters (StoragePort, MetadataDbPort, AiPort, GraphPort)
│   └── api/         # ドメイン別ルート (files, ai-generate, graph-qa)
├── frontend/        # React + Vite + Cloudscape Design System
│   ├── pages/       # FileManager, Viewer, AiGenerate, GraphQA
│   └── api/         # Hono RPC Client (End-to-End Type Safety)
└── infrastructure/  # AWS CDK（🚧 本番スタックは工事中）
```

### 技術スタック

| 層 | 技術 |
|---|---|
| Frontend | React + Vite + Cloudscape + react-router-dom |
| Backend | Hono (Lambda / @hono/node-server) |
| IFC Parser | web-ifc (WASM) |
| 3D Rendering | @thatopen/components + Three.js |
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
```bash
# バックエンド (http://localhost:3001)
npm run dev:mock -w packages/backend

# フロントエンド (http://localhost:5173)
npm run dev:mock -w packages/frontend
```

環境変数 `MOCK_AWS=true` / `VITE_MOCK_AWS=true` が自動設定されます。
AWSリソースへの通信は一切発生しません。

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

## Optional: ローカルLLM (Ollama)

AI生成機能をオフラインでも動かしたい場合、Ollamaを利用できます。

```bash
# Ollamaインストール
curl -fsSL https://ollama.ai/install.sh | sh

# モデルダウンロード
ollama pull llama3.2

# ローカルLLMモードで起動
USE_LOCAL_LLM=true npm run dev:mock -w packages/backend
```

> **Note**: ローカルLLMはMockの代替として使えますが、IFC STEP構文の生成品質はBedrock Claude 4.5 Sonnetの方が圧倒的に高いです。本番品質の生成にはAWSデプロイが推奨です。

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
