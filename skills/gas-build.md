# GAS Build & Deploy

## Pipeline
```
src/*.ts → esbuild(bundle, IIFE, GasPlugin) → dist/Code.js → clasp push → GAS
```

## グローバル関数公開
GASはトップレベル関数のみ認識。esbuildでIIFEに閉じるため明示的に公開が必要:
```typescript
(globalThis as Record<string, unknown>).main = main;
```

## GAS非対応の機能
- import/export → esbuildが解決（ソースではOK）
- fetch() → UrlFetchApp.fetch()
- setTimeout/setInterval → Utilities.sleep() + Time-driven Trigger
- console.log → Logger.log()

## 実行時間制限
- 無料: 6分 / Workspace: 30分
- チャンネル数多い場合はPropertiesServiceに処理済みカーソルを保存してバッチ処理

## clasp
- `clasp login` → Google認証
- `clasp create --type sheets --parentId <ID>` → .clasp.json生成
- `clasp push` → dist/Code.js + appsscript.json をアップロード
- `.claspignore` で不要ファイルを除外

## appsscript.json 必須設定
```json
{
  "timeZone": "Asia/Tokyo",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.scriptapp"
  ]
}
```

## よくあるエラー
| エラー | 対処 |
|--------|------|
| `main is not defined` | globalThis公開忘れ |
| `Property 'UrlFetchApp' does not exist` | tsconfig types に google-apps-script 追加 |
| clasp認証エラー | `clasp login` 再実行 |
