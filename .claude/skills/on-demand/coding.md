# TypeScript規約
- strict mode必須。`any`禁止、`unknown`+型ガードで絞り込む
- 全exportされた関数にJSDocコメント（日本語可）
- GAS固有API（UrlFetchApp, SpreadsheetApp, ScriptApp, PropertiesService, LockService, Utilities, Logger）は `src/services/slack-api.ts` と `src/services/spreadsheet.ts` に閉じ込める
- 各serviceは単一責任。他serviceへの依存は引数経由で注入
- ビジネスロジック（channel-checker.ts）は純粋関数として実装しテスト容易にする

# エラーハンドリング
- Slack API呼び出し: try-catch + リトライ3回 + exponential backoff(1s,2s,4s)
- Rate Limit(HTTP 429): Retry-Afterヘッダーに従って待機
- API間の待機: `Utilities.sleep(500)` をループ内に挟む
- エラーログ: `Logger.log()` で出力。console.log は使わない
- GAS 6分制限: チャンネル数が多い場合はバッチ処理を検討

# コード変更時のワークフロー
1. 型定義(`src/types/index.ts`)を先に確認・更新
2. 実装を変更
3. 関連テストを追加・更新
4. `bash scripts/harness.sh` を実行して全チェック通過を確認
5. 全チェック通過してから完了報告
