# Slack Channel Auto-Archiver

## What
GASアプリ。非活動パブリックチャンネルを警告→アーカイブする。
TypeScript → esbuild + GasPlugin → clasp push → GAS実行。

## Architecture
```
src/*.ts → esbuild(IIFE) → dist/Code.js → clasp push → GAS
                                                          ↓
                                              Time-driven Trigger(毎日9時)
                                                          ↓
                                              Slack API + Spreadsheet
```

## Flow
1. `conversations.list` で全パブリックチャンネル取得
2. 除外フィルタ（チャンネルID / プレフィックス / #general）
3. `conversations.history` で最終投稿日取得
4. 閾値(180日)-警告日数(2日)到達 → 警告メッセージ投稿
5. 閾値到達 & 警告済 & アクションなし → アーカイブ
6. 警告後にリアクション/投稿あり → キャンセル

## Directory
```
CLAUDE.md                         ← this（200行以内厳守）
.claude/
  settings.json                   ← 権限設定
  commands/                       ← スラッシュコマンド
    retrospective.md              ← /retrospective
    skill-create.md               ← /skill-create
    security-check.md             ← /security-check
  skills/
    always/                       ← 常時読み込み
      skill-router.md             ← タスク→スキルのルーティング
      security-policy.md          ← セキュリティポリシー（最優先）
    on-demand/                    ← 必要時のみ読み込み
      coding.md                   ← TypeScript規約
      testing.md                  ← テストルール
      context-management.md       ← コンテキスト管理
      slack-api.md                ← Slack API仕様
      gas-build.md                ← GASビルド仕様
      retrospective-codify.md     ← 振り返り→知見固定化
      skill-guide.md              ← 次アクション提案
      skill-lifecycle.md          ← スキル作成→廃止サイクル
.hooks/                           ← Git hooks
src/                              ← TypeScriptソース
test/                             ← Jestテスト
scripts/harness.sh                ← 統合検証
docs/ARCHITECTURE.md              ← 詳細設計（必要時のみ読む）
```

## Tech Stack
- Lang: TypeScript strict
- Runtime: Google Apps Script (V8)
- Build: esbuild + esbuild-gas-plugin + clasp
- API: Slack Web API (Bot Token: `xoxb-`)
- Config/State: Google Spreadsheet (Config, WarningLog sheets)
- Test: Jest + GAS mocks
- Token: Script Properties経由のみ。ハードコード厳禁

## Commands
```bash
npm run build          # esbuild → dist/Code.js
npm run push           # build + clasp push
npm test               # Jest
npm run lint           # tsc --noEmit
bash scripts/harness.sh  # lint + test + build 一括
```

## Key Rules
- コード変更後は必ず `bash scripts/harness.sh` を実行してから完了報告
- `any` 禁止。`unknown` + 型ガードを使う
- GAS固有API は slack-api.ts と spreadsheet.ts に閉じ込める
- Slack APIはリトライ3回 + exponential backoff + Rate Limit対応必須
- セキュリティ → `always/security-policy.md` 参照（最優先）

## スキル読み込みルール
- `always/` = 毎回読み込み（skill-router + security-policy）
- `on-demand/` = skill-routerのテーブルに従い該当のみ読む
- 不要なスキルを先読み・要約してコンテキストに持ち込まない

## 自律改善ループ
タスク完了 → skill-guide が提案 → /retrospective → スクリーニング → 承認 → 固定化

## Spreadsheet Schema
**Config**: Key-Value形式。archive_threshold_days(180), warning_days_before(2), excluded_channel_ids, excluded_prefixes, dry_run
**WarningLog**: channel_id, channel_name, warned_at, archive_scheduled_at, status(warned/archived/cancelled), warning_message_ts
