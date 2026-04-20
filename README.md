# Slack Channel Auto-Archiver

非活動パブリックチャンネルを自動アーカイブするGASアプリ。

## 機能
- 最終投稿からN日（デフォルト180日）経過したチャンネルを自動アーカイブ
- アーカイブ2日前にBOTが警告メッセージ投稿
- 警告後にリアクション/投稿があればアーカイブ取りやめ
- 除外設定（チャンネルID・プレフィックス指定）
- Dry Runモード対応

## Quick Start
```bash
npm install
npm run build
npx clasp login
npx clasp create --type sheets --parentId <SpreadsheetID>
npx clasp push
```

## Development
```bash
npm test              # テスト
npm run lint          # 型チェック
npm run build         # ビルド
bash scripts/harness.sh  # 全チェック一括
```

## Git Hooks 有効化
```bash
git config core.hooksPath .hooks
```
