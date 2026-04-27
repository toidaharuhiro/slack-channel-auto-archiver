# Slack API

## 認証
Bot Token (`xoxb-`) を使用。Script Propertiesに `SLACK_BOT_TOKEN` として保存。

## Required Scopes
channels:read, channels:history, channels:manage, chat:write

## Rate Limit
| Tier | API | 目安 | 対策 |
|------|-----|------|------|
| 2 | conversations.list, conversations.archive | ~20/min | sleep(500) + cursor pagination |
| 3 | conversations.history | ~50/min | limit=1で最新のみ取得 |
| 4 | chat.postMessage | 緩い | 特に不要 |

429レスポンス時: `Retry-After` ヘッダー秒数分待機。

## Pagination
```typescript
let cursor = '';
do {
  const params: Record<string, string> = { limit: '200' };
  if (cursor) params.cursor = cursor;
  const res = callApi('conversations.list', params);
  cursor = res.response_metadata?.next_cursor ?? '';
  Utilities.sleep(500);
} while (cursor);
```

## conversations.history Tips
- `limit=1` で最新1件のみ取得→効率的
- `oldest` + `inclusive=true` で特定ts以降（自身含む）を取得
- `inclusive=false` で特定ts「より後」を取得
- BOT投稿は `bot_id` フィールドで判別
- リアクションは `reactions` 配列フィールド

## GAS呼び出しパターン
```typescript
// GET
UrlFetchApp.fetch(url, {
  method: 'get',
  headers: { Authorization: `Bearer ${token}` },
  muteHttpExceptions: true,  // 必須
});
// POST
UrlFetchApp.fetch(url, {
  method: 'post',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
  payload: JSON.stringify(body),
  muteHttpExceptions: true,  // 必須
});
```
