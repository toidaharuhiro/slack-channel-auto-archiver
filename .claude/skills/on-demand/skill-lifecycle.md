---
skill: skill-lifecycle
description: スキルの作成・評価・改善・廃止のライフサイクルを管理する
trigger: /skill-create コマンド、新スキル作成時
status: stable
---

# Skill Lifecycle

## ライフサイクル
```
作成(draft) → 試用(trial) → 定着(stable) → 改善(update) → (廃止 deprecated)
```

## 作成ルール

1. **1スキル = 1つの明確な責務**（単一責任）
2. **必須ヘッダー**:
   ```yaml
   ---
   skill: スキル名（kebab-case）
   description: 1行で説明
   trigger: いつ使うか
   status: draft | trial | stable | deprecated
   ---
   ```
3. **配置先の判断**:
   - このプロジェクト固有 → `.claude/skills/on-demand/`
   - 常時必要 → `.claude/skills/always/`（要慎重判断）
4. **セキュリティレビュー**: 機密情報が含まれていないか確認
5. **skill-router更新**: 新スキル追加時はテーブルに行追加

## 評価基準
- 3回以上使われた → trial → stable に昇格検討
- 1ヶ月使われない → deprecated 検討
- 矛盾する内容が出た → 更新 or 分割

## 廃止手順
1. status を deprecated に変更
2. skill-router のテーブルからコメントアウト
3. 1ヶ月後に削除（git履歴に残る）
