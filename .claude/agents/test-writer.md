---
name: test-writer
description: 指定ソースファイルのJestテストを自動作成。引数にファイルパスを指定。承認後に書き出す。
tools: Read, Grep, Glob, Bash
model: sonnet
---

1. `.claude/skills/on-demand/testing.md` を Read で読み込む
2. `test/setup-gas-mocks.ts` と既存テストのパターンを確認
3. 引数のソースファイルを読み、全 export を特定してテストを設計
4. テストコードをユーザーに提示し、承認後にファイルへ書き出す
5. `npx jest --testPathPattern=<対象ファイル名> --forceExit` で動作確認
