import {
  SlackApiResponse,
  SlackChannel,
  SlackMessage,
  ConversationsListResponse,
  ConversationsHistoryResponse,
  ChatPostMessageResponse,
} from '../types';

const SLACK_API_BASE = 'https://slack.com/api';
const MAX_RETRIES = 3;
const RATE_LIMIT_WAIT_MS = 500;

/**
 * HTTPレスポンスから Retry-After ヘッダー値を取得する（大文字小文字を区別しない）
 */
function getRetryAfterSeconds(response: GoogleAppsScript.URL_Fetch.HTTPResponse): number {
  const headers = response.getHeaders() as Record<string, string>;
  const entry = Object.entries(headers).find(([k]) => k.toLowerCase() === 'retry-after');
  return parseInt(entry?.[1] ?? '5', 10) || 5;
}

/**
 * Slack API へ GET リクエストを送信する（リトライ付き）
 */
function callSlackApi<T extends SlackApiResponse>(
  token: string,
  method: string,
  params: Record<string, string> = {}
): T {
  let lastError: string | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const waitMs = Math.pow(2, attempt) * 1000;
      Logger.log(`リトライ ${attempt}/${MAX_RETRIES}: ${waitMs}ms 待機...`);
      Utilities.sleep(waitMs);
    }

    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const url = `${SLACK_API_BASE}/${method}?${queryString}`;
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true,
    });

    const statusCode = response.getResponseCode();
    if (statusCode === 429) {
      const retryAfter = getRetryAfterSeconds(response);
      Logger.log(`Rate limited. ${retryAfter}秒待機します。`);
      Utilities.sleep(retryAfter * 1000);
      continue;
    }

    const body = JSON.parse(response.getContentText()) as T;
    if (!body.ok) {
      lastError = body.error ?? 'unknown error';
      Logger.log(`Slack API エラー (${method}): ${lastError}`);
      if (lastError === 'ratelimited') continue;
      throw new Error(`Slack API ${method} failed: ${lastError}`);
    }

    return body;
  }

  throw new Error(`Slack API ${method} failed after ${MAX_RETRIES} retries: ${lastError}`);
}

/**
 * Slack API へ POST リクエストを送信する（リトライ + Rate Limit 対応付き）
 * @param ignoredErrors - ok=false でも無視するエラーコードのリスト
 */
function callSlackApiPost<T extends SlackApiResponse>(
  token: string,
  endpoint: string,
  payload: object,
  ignoredErrors: string[] = []
): T {
  let lastError: string | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const waitMs = Math.pow(2, attempt) * 1000;
      Logger.log(`リトライ ${attempt}/${MAX_RETRIES}: ${waitMs}ms 待機...`);
      Utilities.sleep(waitMs);
    }

    const url = `${SLACK_API_BASE}/${endpoint}`;
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    const statusCode = response.getResponseCode();
    if (statusCode === 429) {
      const retryAfter = getRetryAfterSeconds(response);
      Logger.log(`Rate limited. ${retryAfter}秒待機します。`);
      Utilities.sleep(retryAfter * 1000);
      continue;
    }

    const body = JSON.parse(response.getContentText()) as T;
    if (!body.ok) {
      lastError = body.error ?? 'unknown error';
      if (ignoredErrors.includes(lastError)) return body;
      Logger.log(`Slack API エラー (${endpoint}): ${lastError}`);
      if (lastError === 'ratelimited') continue;
      throw new Error(`Slack API ${endpoint} failed: ${lastError}`);
    }

    return body;
  }

  throw new Error(`Slack API ${endpoint} failed after ${MAX_RETRIES} retries: ${lastError}`);
}

/**
 * 全パブリックチャンネルを取得する（ページネーション対応）
 */
export function getAllPublicChannels(token: string): SlackChannel[] {
  const channels: SlackChannel[] = [];
  let cursor = '';

  do {
    const params: Record<string, string> = {
      types: 'public_channel',
      exclude_archived: 'true',
      limit: '200',
    };
    if (cursor) params.cursor = cursor;

    const res = callSlackApi<ConversationsListResponse>(token, 'conversations.list', params);
    channels.push(...res.channels);
    cursor = res.response_metadata?.next_cursor ?? '';

    Utilities.sleep(RATE_LIMIT_WAIT_MS);
  } while (cursor);

  return channels;
}

/**
 * チャンネルの最新メッセージを取得する
 */
export function getLatestMessage(token: string, channelId: string): SlackMessage | null {
  const res = callSlackApi<ConversationsHistoryResponse>(token, 'conversations.history', {
    channel: channelId,
    limit: '1',
  });
  return res.messages.length > 0 ? res.messages[0] : null;
}

/**
 * 指定タイムスタンプ以降のメッセージを取得する（BOT投稿除外用）
 */
export function getMessagesSince(
  token: string,
  channelId: string,
  oldestTs: string,
  limit: number = 10
): SlackMessage[] {
  const res = callSlackApi<ConversationsHistoryResponse>(token, 'conversations.history', {
    channel: channelId,
    oldest: oldestTs,
    limit: String(limit),
    inclusive: 'false',
  });
  return res.messages;
}

/**
 * 指定タイムスタンプのメッセージを含めて取得する（リアクション確認用）
 */
export function getMessagesIncluding(
  token: string,
  channelId: string,
  oldestTs: string,
  limit: number = 10
): SlackMessage[] {
  const res = callSlackApi<ConversationsHistoryResponse>(token, 'conversations.history', {
    channel: channelId,
    oldest: oldestTs,
    limit: String(limit),
    inclusive: 'true',
  });
  return res.messages;
}

/**
 * チャンネルに警告メッセージを投稿する（リトライ + Rate Limit 対応）
 */
export function postWarningMessage(
  token: string,
  channelId: string,
  text: string,
  blocks: object[]
): string {
  const body = callSlackApiPost<ChatPostMessageResponse>(token, 'chat.postMessage', {
    channel: channelId,
    text,
    blocks,
  });
  return body.ts;
}

/**
 * チャンネルをアーカイブする（リトライ + Rate Limit 対応）
 */
export function archiveChannel(token: string, channelId: string): void {
  callSlackApiPost<SlackApiResponse>(
    token,
    'conversations.archive',
    { channel: channelId },
    ['already_archived']
  );
}
