---
skill: retrospective-codify
description: タスク完了後の振り返り→知見をskill/ルールに固定化する
trigger: /retrospective コマンド、またはタスク完了時にskill-guideが提案
status: stable
---

# Retrospective Codify

## ワークフロー

1. **棚卸し**: 直近タスクの問題・成功を時系列で列挙。失敗↔成功を対にする
2. **分類**: 各知見を以下のいずれかに振り分ける
   - `CLAUDE.md` — プロジェクト全体のルール変更
   - `on-demand/スキル名.md` — 特定領域の知識追加
   - `always/security-policy.md` — セキュリティに関する知見
   - `linter/ast-grep` — 静的検査で自動化できるルール
3. **スクリーニング**: APIキー/個人情報/内部URL → `<PLACEHOLDER>` に置換
4. **重複チェック**: 既存スキル・ルールと照合。矛盾 → ユーザーに確認
5. **提案**: 以下のフォーマットで提示
   ```
   📝 振り返り(N件) 🔒スクリーニング済
   1. [coding.md] エラーハンドリングに○○パターンを追加
   2. [CLAUDE.md] ○○ルールを更新
   承認: 番号 / all / edit N
   ```
6. **固定化**: 承認されたもののみ書き出し。skill-router.md のテーブルも必要に応じて更新

## 記述ルール
- 1ルール=1行（最大2行）。散文禁止
- 重複→追記でなく更新
- コード例は ❌→✅ 対比1組のみ
- 修飾語を省き動詞で簡潔に
