# セキュリティルール

以下はコード変更・テスト・外部連携時に必ずチェックする項目。

## トークン管理
- Slack Bot Token は `PropertiesService.getScriptProperties()` 経由でのみ取得
- ソースコード内に `xoxb-` 等のトークン文字列をハードコードしない
- `.clasp.json`（スクリプトID含む）は `.gitignore` で除外済み
- `.env` ファイルを作成した場合は `.gitignore` に含まれていることを確認

## API呼び出し
- `UrlFetchApp.fetch()` の全呼び出しに `muteHttpExceptions: true` を設定
- レスポンスは必ず `ok` フィールドを確認してからデータを使用
- トークンは Authorization ヘッダーで送信。URLパラメータに含めない

## 入力値検証
- Spreadsheetから読み込む設定値は型変換+デフォルト値フォールバック
- カンマ区切り値はtrim+空文字フィルタを通す
- 数値設定は `parseInt` + `|| DEFAULT` パターン

## テスト・デプロイ前チェック
- `grep -rn "xoxb-" src/` でトークン漏洩がないことを確認
- `grep -rn ": any" src/` で any 型がないことを確認
- dry_run=true での動作確認を本番デプロイ前に必ず実施
