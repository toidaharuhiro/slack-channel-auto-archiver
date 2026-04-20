# アーキテクチャ詳細設計

## 1. システム全体図

```
┌─────────────────────────────────────────────────┐
│                Google Apps Script                │
│                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌─────────┐ │
│  │ Trigger   │──▶│   main()     │──▶│ Slack   │ │
│  │ (毎日1回) │   │              │   │ API     │ │
│  └──────────┘   │ 1.チャンネル取得│   └─────────┘ │
│                 │ 2.除外フィルタ │                │
│                 │ 3.期限判定    │   ┌─────────┐ │
│                 │ 4.警告/archive│──▶│ Spread  │ │
│                 └──────────────┘   │ sheet   │ │
│                                     └─────────┘ │
└─────────────────────────────────────────────────┘
```

## 2. 状態遷移

チャンネルは以下の状態を持つ:

```
[active] ──(閾値-2日経過)──▶ [warned] ──(2日経過 & アクションなし)──▶ [archived]
                                │
                                └──(アクションあり)──▶ [cancelled] → [active]に戻る
```

### 判定ロジック詳細

```typescript
// 擬似コード
for each channel:
  if isExcluded(channel): skip

  lastActivity = getLastMessageTimestamp(channel)
  daysSinceActivity = diffDays(now, lastActivity)
  warningThreshold = archiveThresholdDays - warningDaysBefore

  if daysSinceActivity >= archiveThresholdDays:
    warningRecord = getWarningRecord(channel.id)
    if warningRecord && warningRecord.status === 'warned':
      if hasActivitySinceWarning(channel, warningRecord.warned_at):
        cancelWarning(channel)     // アーカイブ取りやめ
      else:
        archiveChannel(channel)    // アーカイブ実行
    // 警告なしでいきなり閾値超えた場合（初回実行など）→ 警告を出す
    else if !warningRecord:
      sendWarning(channel)

  elif daysSinceActivity >= warningThreshold:
    if !hasActiveWarning(channel.id):
      sendWarning(channel)
```

## 3. Slack API 使用エンドポイント

| メソッド | 用途 | Scope |
|----------|------|-------|
| `conversations.list` | パブリックチャンネル一覧取得 | `channels:read` |
| `conversations.history` | チャンネルの投稿履歴取得 | `channels:history` |
| `conversations.archive` | チャンネルをアーカイブ | `channels:manage` |
| `chat.postMessage` | 警告メッセージ投稿 | `chat:write` |

### Rate Limit対策

- `conversations.list`: Tier 2（20 req/min）→ カーソルページネーション間に500ms待機
- `conversations.history`: Tier 3（50 req/min）→ limit=1で最新1件だけ取得
- `conversations.archive`: Tier 2 → 1件ずつ500ms間隔
- `chat.postMessage`: Tier 4 → 特に制限不要

## 4. Google Spreadsheet スキーマ

### Config シート

| Row | Key | Value | Description |
|-----|-----|-------|-------------|
| 1 | archive_threshold_days | 180 | アーカイブまでの非活動日数 |
| 2 | warning_days_before | 2 | アーカイブ何日前に警告するか |
| 3 | excluded_channel_ids | C01XXXX,C02YYYY | 除外チャンネルID |
| 4 | excluded_prefixes | proj-,dept-,team- | 除外プレフィックス |
| 5 | warning_message | このチャンネルは{days}日間投稿がないため、{archive_date}にアーカイブ予定です。アーカイブを防ぐには、このメッセージにリアクションするか、何か投稿してください。 | 警告メッセージテンプレート |
| 6 | dry_run | false | true の場合、実際のアーカイブを行わない |

### WarningLog シート

| Column | Type | Description |
|--------|------|-------------|
| A: channel_id | string | チャンネルID |
| B: channel_name | string | チャンネル名 |
| C: warned_at | datetime | 警告投稿日時 |
| D: archive_scheduled_at | datetime | アーカイブ予定日時 |
| E: status | enum | `warned` / `archived` / `cancelled` |
| F: warning_message_ts | string | 警告メッセージのts（アクション検知用） |

## 5. 警告メッセージ仕様

```json
{
  "channel": "C01XXXXX",
  "text": "⚠️ このチャンネルは180日間投稿がないため、2026-04-15にアーカイブ予定です。",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "⚠️ *アーカイブ予告*\n\nこのチャンネルは *180日間* 投稿がありません。\n*2026-04-15* にアーカイブされる予定です。"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "アーカイブを防ぐには、以下のいずれかを行ってください：\n• このメッセージに何かリアクション（絵文字）をつける\n• このチャンネルに何か投稿する"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "🤖 Slack Channel Archiver Bot | 設定変更は管理者にお問い合わせください"
        }
      ]
    }
  ]
}
```

## 6. アクション検知ロジック

警告投稿後のアクション検知には以下を確認する:

1. **新規投稿の検知**: `conversations.history` で `oldest=warning_message_ts` として取得し、BOT自身の投稿を除外して1件でもあればアクションありと判定
2. **リアクションの検知**: `conversations.history` で警告メッセージを取得し、`reactions` フィールドを確認

```typescript
async function hasActivitySinceWarning(
  channelId: string,
  warningTs: string
): Promise<boolean> {
  // 1. 警告以降の投稿を確認
  const history = getHistory(channelId, { oldest: warningTs, limit: 5 });
  const humanMessages = history.messages.filter(
    m => m.ts !== warningTs && !m.bot_id
  );
  if (humanMessages.length > 0) return true;

  // 2. 警告メッセージへのリアクションを確認
  const warningMsg = history.messages.find(m => m.ts === warningTs);
  if (warningMsg?.reactions && warningMsg.reactions.length > 0) return true;

  return false;
}
```

## 7. エラーハンドリング戦略

- **Slack API エラー**: 3回リトライ（1s, 2s, 4s の exponential backoff）
- **GAS 6分制限**: チャンネル数が多い場合、PropertiesService に処理済みカーソルを保存し、次回トリガーで続きから処理
- **Spreadsheet ロック**: `LockService.getScriptLock()` で排他制御
- **致命的エラー**: 管理者チャンネルに通知（オプション）
