デプロイ前チェック → clasp push。

1. `bash scripts/harness.sh` で全チェック通過を確認（失敗時は中断）
2. `.clasp.json` の存在確認（なければ `clasp login` を案内）
3. ユーザーに確認を取ってから `npm run push`
