import { AppConfig, ChannelAssessment, WarningRecord } from '../types';
import * as slackApi from './slack-api';
import { addDays, formatDate } from '../utils/date';

/**
 * 警告メッセージ用の Block Kit ペイロードを生成する
 */
export function buildWarningBlocks(
  channelName: string,
  daysSinceActivity: number,
  archiveDate: Date
): object[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `⚠️ *アーカイブ予告*\n\n` +
          `このチャンネル (#${channelName}) は *${daysSinceActivity}日間* 投稿がありません。\n` +
          `*${formatDate(archiveDate)}* にアーカイブされる予定です。`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          'アーカイブを防ぐには、以下のいずれかを行ってください：\n' +
          '• このメッセージに何かリアクション（絵文字）をつける\n' +
          '• このチャンネルに何か投稿する',
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '🤖 Slack Channel Archiver Bot | 設定変更は管理者にお問い合わせください',
        },
      ],
    },
  ];
}

/**
 * 警告メッセージをチャンネルに投稿し、WarningRecord を返す
 */
export function sendWarning(
  assessment: ChannelAssessment,
  config: AppConfig
): WarningRecord {
  const now = new Date();
  const archiveDate = addDays(now, config.warningDaysBefore);

  const blocks = buildWarningBlocks(
    assessment.channel.name,
    assessment.daysSinceLastActivity,
    archiveDate
  );

  const plainText =
    `⚠️ このチャンネルは${assessment.daysSinceLastActivity}日間投稿がないため、` +
    `${formatDate(archiveDate)}にアーカイブ予定です。` +
    `アーカイブを防ぐには、何かリアクションか投稿をしてください。`;

  let warningTs = 'dry-run';
  if (!config.dryRun) {
    warningTs = slackApi.postWarningMessage(
      config.slackBotToken,
      assessment.channel.id,
      plainText,
      blocks
    );
  }

  Logger.log(
    `${config.dryRun ? '[DRY RUN] ' : ''}警告投稿: #${assessment.channel.name} (${assessment.channel.id})`
  );

  return {
    channelId: assessment.channel.id,
    channelName: assessment.channel.name,
    warnedAt: now,
    archiveScheduledAt: archiveDate,
    status: 'warned',
    warningMessageTs: warningTs,
  };
}

/**
 * チャンネルをアーカイブする
 */
export function executeArchive(
  assessment: ChannelAssessment,
  config: AppConfig
): void {
  if (!config.dryRun) {
    slackApi.archiveChannel(config.slackBotToken, assessment.channel.id);
  }
  Logger.log(
    `${config.dryRun ? '[DRY RUN] ' : ''}アーカイブ実行: #${assessment.channel.name} (${assessment.channel.id})`
  );
}

/**
 * 警告投稿後にチャンネルでアクティビティがあったか確認する
 */
export function checkActivitySinceWarning(
  channelId: string,
  warningTs: string,
  botToken: string
): boolean {
  // inclusive=true で warningTs のメッセージ自体も含めて取得
  const messages = slackApi.getMessagesIncluding(botToken, channelId, warningTs, 10);

  // 警告メッセージ以外で、BOT以外の投稿があればアクションあり
  const humanMessages = messages.filter(
    (m) => m.ts !== warningTs && !m.bot_id
  );
  if (humanMessages.length > 0) return true;

  // 警告メッセージ自体へのリアクションを確認
  const warningMsg = messages.find((m) => m.ts === warningTs);
  if (warningMsg?.reactions && warningMsg.reactions.length > 0) return true;

  return false;
}
