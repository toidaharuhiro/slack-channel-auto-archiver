import { AppConfig } from '../types';

/** デフォルト設定値 */
const DEFAULTS: Omit<AppConfig, 'slackBotToken'> = {
  archiveThresholdDays: 180,
  warningDaysBefore: 2,
  excludedChannelIds: [],
  excludedPrefixes: [],
  warningMessageTemplate:
    '⚠️ *アーカイブ予告*\n\n' +
    'このチャンネルは *{days}日間* 投稿がありません。\n' +
    '*{archive_date}* にアーカイブされる予定です。\n\n' +
    'アーカイブを防ぐには、このメッセージにリアクション（絵文字）をつけるか、何か投稿してください。',
  dryRun: false,
};

/**
 * Script Properties から Slack Bot Token を取得する
 */
function getSlackBotToken(): string {
  const token = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
  if (!token) {
    throw new Error('SLACK_BOT_TOKEN が Script Properties に設定されていません');
  }
  return token;
}

/**
 * FORCE_DRY_RUN プロパティが設定されているか確認する（testRun用）
 */
function isForceDryRun(): boolean {
  return PropertiesService.getScriptProperties().getProperty('FORCE_DRY_RUN') === 'true';
}

/**
 * Config シートから設定を読み込む。
 * シートが存在しない or 値が空の場合はデフォルト値を使用する。
 */
export function loadConfig(): AppConfig {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Config');

  if (!sheet) {
    Logger.log('Config シートが見つかりません。デフォルト設定を使用します。');
    return { ...DEFAULTS, dryRun: isForceDryRun() || DEFAULTS.dryRun, slackBotToken: getSlackBotToken() };
  }

  const data = sheet.getDataRange().getValues();
  const configMap = new Map<string, string>();
  for (const row of data) {
    if (row[0] && row[1] !== undefined && row[1] !== '') {
      configMap.set(String(row[0]).trim(), String(row[1]).trim());
    }
  }

  const rawThreshold = parseInt(configMap.get('archive_threshold_days') ?? '', 10);
  const archiveThresholdDays = rawThreshold > 0 ? rawThreshold : DEFAULTS.archiveThresholdDays;

  const rawWarningDays = parseInt(configMap.get('warning_days_before') ?? '', 10);
  const warningDaysBefore = !isNaN(rawWarningDays) && rawWarningDays >= 0
    ? rawWarningDays
    : DEFAULTS.warningDaysBefore;

  if (warningDaysBefore >= archiveThresholdDays) {
    throw new Error(
      `設定エラー: warning_days_before (${warningDaysBefore}) は ` +
      `archive_threshold_days (${archiveThresholdDays}) 以上に設定できません`
    );
  }

  return {
    archiveThresholdDays,
    warningDaysBefore,
    excludedChannelIds: parseCommaSeparated(configMap.get('excluded_channel_ids')),
    excludedPrefixes: parseCommaSeparated(configMap.get('excluded_prefixes')),
    warningMessageTemplate: configMap.get('warning_message') || DEFAULTS.warningMessageTemplate,
    dryRun: isForceDryRun() || configMap.get('dry_run')?.toLowerCase() === 'true',
    slackBotToken: getSlackBotToken(),
  };
}

/**
 * カンマ区切り文字列を配列にパースする
 */
function parseCommaSeparated(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
}
