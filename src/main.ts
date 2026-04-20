import { loadConfig } from './config/settings';
import { ExecutionSummary, ExecutionError } from './types';
import * as slackApi from './services/slack-api';
import * as spreadsheet from './services/spreadsheet';
import { isExcluded, assessChannel } from './services/channel-checker';
import { sendWarning, executeArchive, checkActivitySinceWarning } from './services/archiver';
import { logInfo, logError } from './utils/logger';

/**
 * メインエントリポイント。GAS の Time-driven トリガーから呼ばれる。
 * 全パブリックチャンネルをスキャンし、警告・アーカイブを実行する。
 */
function main(): void {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    logError('main', '別のプロセスが実行中です。スキップします。');
    return;
  }

  try {
    const config = loadConfig();
    logInfo('main', '実行開始', {
      threshold: config.archiveThresholdDays,
      warningDays: config.warningDaysBefore,
      dryRun: config.dryRun,
    });

    const summary: ExecutionSummary = {
      executedAt: new Date(),
      totalChannelsScanned: 0,
      excludedCount: 0,
      warnedChannels: [],
      archivedChannels: [],
      cancelledChannels: [],
      errors: [],
    };

    // 1. 全パブリックチャンネルを取得
    const channels = slackApi.getAllPublicChannels(config.slackBotToken);
    summary.totalChannelsScanned = channels.length;
    logInfo('main', `${channels.length} 件のパブリックチャンネルを取得`);

    // 2. 各チャンネルを処理
    for (const channel of channels) {
      try {
        // 除外チェック
        if (isExcluded(channel, config)) {
          summary.excludedCount++;
          continue;
        }

        // 最終メッセージ取得
        const latestMessage = slackApi.getLatestMessage(config.slackBotToken, channel.id);
        const lastActivityTs = latestMessage ? parseFloat(latestMessage.ts) : null;

        // 既存の警告レコード取得
        const existingWarning = spreadsheet.getActiveWarning(channel.id);

        // 警告後のアクティビティ確認
        let hasActivity = false;
        if (existingWarning && existingWarning.status === 'warned') {
          hasActivity = checkActivitySinceWarning(
            channel.id,
            existingWarning.warningMessageTs,
            config.slackBotToken
          );
        }

        // 判定
        const assessment = assessChannel(
          channel,
          lastActivityTs,
          config,
          existingWarning,
          hasActivity
        );

        // アクション実行
        switch (assessment.action) {
          case 'warn': {
            const record = sendWarning(assessment, config);
            spreadsheet.addWarningRecord(record);
            summary.warnedChannels.push(channel.name);
            break;
          }
          case 'archive': {
            executeArchive(assessment, config);
            spreadsheet.updateWarningStatus(channel.id, 'archived');
            summary.archivedChannels.push(channel.name);
            break;
          }
          case 'cancel_warning': {
            spreadsheet.updateWarningStatus(channel.id, 'cancelled');
            summary.cancelledChannels.push(channel.name);
            logInfo('main', `警告キャンセル: #${channel.name}（アクションあり）`);
            break;
          }
          case 'none':
            break;
        }

        // Rate limit 対策
        Utilities.sleep(300);
      } catch (error) {
        const execError: ExecutionError = {
          channelId: channel.id,
          channelName: channel.name,
          operation: 'process_channel',
          message: error instanceof Error ? error.message : String(error),
        };
        summary.errors.push(execError);
        logError('main', `チャンネル処理エラー: #${channel.name}`, error);
      }
    }

    // 3. サマリログ
    logInfo('main', '実行完了', {
      scanned: summary.totalChannelsScanned,
      excluded: summary.excludedCount,
      warned: summary.warnedChannels.length,
      archived: summary.archivedChannels.length,
      cancelled: summary.cancelledChannels.length,
      errors: summary.errors.length,
    });

    if (summary.warnedChannels.length > 0) {
      logInfo('main', `警告チャンネル: ${summary.warnedChannels.join(', ')}`);
    }
    if (summary.archivedChannels.length > 0) {
      logInfo('main', `アーカイブチャンネル: ${summary.archivedChannels.join(', ')}`);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * GAS の Time-driven トリガーをセットアップする。
 * 初回のみ手動実行する。
 */
function setupTriggers(): void {
  // 既存トリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // 毎日午前9時に実行するトリガーを作成
  ScriptApp.newTrigger('main')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  logInfo('setupTriggers', '日次トリガーを設定しました（毎日9:00 JST）');
}

/**
 * 手動テスト用: dry run モードで1回実行する
 */
function testRun(): void {
  const props = PropertiesService.getScriptProperties();
  const originalDryRun = props.getProperty('FORCE_DRY_RUN');
  props.setProperty('FORCE_DRY_RUN', 'true');

  try {
    main();
  } finally {
    if (originalDryRun) {
      props.setProperty('FORCE_DRY_RUN', originalDryRun);
    } else {
      props.deleteProperty('FORCE_DRY_RUN');
    }
  }
}

// GAS のグローバルスコープに関数を公開
// esbuild バンドル後、これらがグローバルに露出するようにする
(globalThis as Record<string, unknown>).main = main;
(globalThis as Record<string, unknown>).setupTriggers = setupTriggers;
(globalThis as Record<string, unknown>).testRun = testRun;
