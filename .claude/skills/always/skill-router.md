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

| タスク | 読み込むスキル(on-demand/) |
|-------|--------------------------|
| コード作成/修正/レビュー | coding, slack-api, gas-build |
| テスト作成/修正 | coding, testing |
| タスク完了/振り返り | retrospective-codify, skill-guide |
| スキル作成/編集 | skill-lifecycle |
| トークン節約/大規模変更 | context-management |
| 質問/調査/相談 | なし |
| 不明/複合 | skill-guide |

## 常時ロード(always/)
- security-policy.md
- skill-router.md（本ファイル）

新スキル追加時は本テーブルに行を追加すること。
