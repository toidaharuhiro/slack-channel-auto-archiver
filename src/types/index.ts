/** Slack チャンネル情報 */
export interface SlackChannel {
  id: string;
  name: string;
  is_archived: boolean;
  is_general: boolean;
  created: number;
  num_members: number;
}

/** Slack メッセージ */
export interface SlackMessage {
  type: string;
  ts: string;
  text: string;
  user?: string;
  bot_id?: string;
  reactions?: SlackReaction[];
}

/** Slack リアクション */
export interface SlackReaction {
  name: string;
  count: number;
  users: string[];
}

/** Slack API レスポンス共通 */
export interface SlackApiResponse {
  ok: boolean;
  error?: string;
  response_metadata?: {
    next_cursor?: string;
  };
}

/** conversations.list レスポンス */
export interface ConversationsListResponse extends SlackApiResponse {
  channels: SlackChannel[];
}

/** conversations.history レスポンス */
export interface ConversationsHistoryResponse extends SlackApiResponse {
  messages: SlackMessage[];
  has_more: boolean;
}

/** chat.postMessage レスポンス */
export interface ChatPostMessageResponse extends SlackApiResponse {
  ts: string;
  channel: string;
}

/** アプリ設定（Spreadsheetから読み込む） */
export interface AppConfig {
  archiveThresholdDays: number;
  warningDaysBefore: number;
  excludedChannelIds: string[];
  excludedPrefixes: string[];
  warningMessageTemplate: string;
  dryRun: boolean;
  slackBotToken: string;
}

/** 警告ログレコード */
export interface WarningRecord {
  channelId: string;
  channelName: string;
  warnedAt: Date;
  archiveScheduledAt: Date;
  status: WarningStatus;
  warningMessageTs: string;
}

/** 警告ステータス */
export type WarningStatus = 'warned' | 'archived' | 'cancelled';

/** チャンネル判定結果 */
export interface ChannelAssessment {
  channel: SlackChannel;
  daysSinceLastActivity: number;
  action: ChannelAction;
  existingWarning?: WarningRecord;
}

/** チャンネルに対して取るべきアクション */
export type ChannelAction =
  | 'none'           // 何もしない（活動あり or 除外対象）
  | 'warn'           // 警告メッセージを投稿
  | 'archive'        // アーカイブ実行
  | 'cancel_warning'; // 警告取りやめ（アクションがあった）

/** 実行結果サマリ */
export interface ExecutionSummary {
  executedAt: Date;
  totalChannelsScanned: number;
  excludedCount: number;
  warnedChannels: string[];
  archivedChannels: string[];
  cancelledChannels: string[];
  errors: ExecutionError[];
}

/** 実行エラー */
export interface ExecutionError {
  channelId: string;
  channelName: string;
  operation: string;
  message: string;
}
