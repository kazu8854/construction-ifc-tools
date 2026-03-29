# Infrastructure (AWS CDK)

このパッケージは **Construction IFC Tools** 用の AWS インフラ（CDK TypeScript）です。

## ステータス: 🚧 工事中

本番向けスタックの構成・リソース配線・デプロイ手順は **未完成** です。リポジトリルートの [README.md](../../README.md) に、AWS 側が工事中である旨とローカル Mock 推奨が書いてあります。

開発の主戦場は現状 **`MOCK_AWS=true` のローカルバックエンド／フロント** です。

## CDK 開発時のコマンド例

* `npm run build` — TypeScript コンパイル
* `npm run watch` — ウォッチビルド
* `npm run test` — Jest ユニットテスト
* `npx cdk synth` — CloudFormation テンプレート生成（中身の確認用）
* `npx cdk diff` / `npx cdk deploy` — **スタックが整ってから** 本番／検証アカウントで利用

`cdk.json` が CDK Toolkit の実行方法を指定します。
