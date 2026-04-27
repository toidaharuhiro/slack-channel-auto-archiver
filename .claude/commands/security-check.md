ステージングのセキュリティ検査。
1. `git diff --cached --name-only` で対象取得
2. `security-policy.md` の機密パターンで検査
3. `.gitignore` 確認
4. 結果: ✅問題なし or ❌該当箇所+対処提案
