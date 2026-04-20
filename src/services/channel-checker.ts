import {
  SlackChannel,
  AppConfig,
  WarningRecord,
  ChannelAssessment,
  ChannelAction,
} from '../types';
import { daysBetween } from '../utils/date';

/**
 * チャンネルが除外対象かどうか判定する
 */
export function isExcluded(channel: SlackChannel, config: AppConfig): boolean {
  // #general は常に除外
  if (channel.is_general) return true;

  // チャンネルID による除外
  if (config.excludedChannelIds.includes(channel.id)) return true;

  // プレフィックスによる除外
  for (const prefix of config.excludedPrefixes) {
    if (channel.name.startsWith(prefix)) return true;
  }

  return false;
}

/**
 * チャンネルの状態を判定し、取るべきアクションを返す
 *
 * @param channel - 対象チャンネル
 * @param lastActivityTs - 最後のアクティビティのUNIXタイムスタンプ（秒）。null なら作成日を使う
 * @param config - アプリ設定
 * @param existingWarning - 既存の警告レコード（あれば）
 * @param hasActivitySinceWarning - 警告後にアクションがあったか
 * @param now - 現在日時（テスト用にDI可能）
 */
export function assessChannel(
  channel: SlackChannel,
  lastActivityTs: number | null,
  config: AppConfig,
  existingWarning: WarningRecord | undefined,
  hasActivitySinceWarning: boolean,
  now: Date = new Date()
): ChannelAssessment {
  // 最終アクティビティ日時（メッセージがない場合はチャンネル作成日を使う）
  const lastActivityDate = lastActivityTs
    ? new Date(lastActivityTs * 1000)
    : new Date(channel.created * 1000);

  const daysSinceLastActivity = daysBetween(lastActivityDate, now);
  const warningThreshold = config.archiveThresholdDays - config.warningDaysBefore;

  let action: ChannelAction = 'none';

  if (daysSinceLastActivity >= config.archiveThresholdDays) {
    // 閾値を超過
    if (existingWarning && existingWarning.status === 'warned') {
      if (hasActivitySinceWarning) {
        action = 'cancel_warning';
      } else {
        action = 'archive';
      }
    } else if (!existingWarning || existingWarning.status === 'cancelled') {
      // 警告なしで閾値超え（初回 or 前回キャンセル済み）→ まず警告
      action = 'warn';
    }
  } else if (daysSinceLastActivity >= warningThreshold) {
    // 警告ゾーン
    if (!existingWarning || existingWarning.status !== 'warned') {
      action = 'warn';
    }
    // 既に警告済みなら何もしない（アーカイブ日を待つ）
  }

  return {
    channel,
    daysSinceLastActivity,
    action,
    existingWarning,
  };
}
