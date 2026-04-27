# テストルール

## テスト構成
- テストランナー: Jest + ts-jest
- GASグローバルオブジェクト: `test/setup-gas-mocks.ts` で自動モック
- テストファイル配置: `test/*.test.ts`

## テスト対象と方針
- `channel-checker.ts`: 純粋関数。全分岐をカバー（除外判定、状態遷移）
- `date.ts`: 全ユーティリティ関数のエッジケース
- `slack-api.ts`, `spreadsheet.ts`: GAS API依存のためモックベースで検証
- `archiver.ts`: sendWarning/executeArchive/checkActivitySinceWarning の各パス

## テスト追加時の方針
- 新機能には必ずテストを追加
- バグ修正時はバグを再現するテストを先に書く
- テストデータは `makeChannel()` 等のヘルパーで生成。ハードコード最小限
- 日時テストは `now` 引数でDI。`new Date()` 直接呼び出しを避ける

## 実行コマンド
```bash
npm test                    # 全テスト
npm test -- --watch         # ウォッチモード
npm test -- --coverage      # カバレッジ付き
bash scripts/harness.sh --test  # ハーネス経由
```
