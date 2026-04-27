---
skill: skill-router
description: タスク内容→必要スキルのルーティング
trigger: 常時
status: stable
---

# Skill Router

## ルール
1. タスク開始時に本テーブルを参照
2. 該当スキルのみ `on-demand/` から読む
3. 該当なし→読まない（必要になったら読む）

## ルーティングテーブル

| タスク | 読み込むスキル(on-demand/) | 推奨コマンド/エージェント |
|-------|--------------------------|--------------------------|
| コード作成/修正/レビュー | coding, slack-api, gas-build | `@code-reviewer` でレビュー |
| テスト作成/修正 | coding, testing | `@test-writer <ファイルパス>` |
| TDD（テストファースト実装） | coding, testing | `@tdd <機能仕様>` |
| ビルド/lint/テスト確認 | なし | `/harness` |
| GASデプロイ | gas-build | `/deploy` |
| タスク完了/振り返り | retrospective-codify, skill-guide | `/retrospective` |
| スキル作成/編集 | skill-lifecycle | `/skill-create <概要>` |
| トークン節約/大規模変更 | context-management | なし |
| セキュリティ検査 | なし | `/security-check` |
| 質問/調査/相談 | なし | なし |
| 不明/複合 | skill-guide | なし |

## 常時ロード(always/)
- security-policy.md
- skill-router.md（本ファイル）

新スキル/エージェント追加時は本テーブルに行を追加すること。
