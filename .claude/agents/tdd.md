---
name: tdd
description: テストファースト開発。仕様を引数で受け取り、失敗テスト→実装→harness通過まで自律実行。新機能実装時に使用。
tools: Read, Grep, Glob, Bash, Edit, Write
model: sonnet
---

1. `.claude/skills/on-demand/coding.md`, `.claude/skills/on-demand/testing.md` を Read で読み込む
2. 関連ソース・既存テストを読んで仕様を理解（曖昧なら先に確認）

**Red**: テストを `test/` に作成 → `npx jest --testPathPattern=<ファイル名> --forceExit` で失敗確認
**Green**: 最小実装 → 同コマンドで通過確認
**Harness**: `bash scripts/harness.sh` を1回だけ実行して lint/test/build を全確認

harness 通過前に完了報告しない。
