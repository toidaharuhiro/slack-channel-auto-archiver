import { WarningRecord, WarningStatus } from '../types';

const WARNING_LOG_SHEET_NAME = 'WarningLog';

/**
 * WarningLog シートを取得（なければ作成）する
 */
function getOrCreateWarningLogSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(WARNING_LOG_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(WARNING_LOG_SHEET_NAME);
    sheet.appendRow([
      'channel_id',
      'channel_name',
      'warned_at',
      'archive_scheduled_at',
      'status',
      'warning_message_ts',
    ]);
    Logger.log('WarningLog シートを新規作成しました');
  }

  return sheet;
}

/**
 * 指定チャンネルの最新の警告レコードを取得する
 * （status が "warned" のもの）
 */
export function getActiveWarning(channelId: string): WarningRecord | undefined {
  const sheet = getOrCreateWarningLogSheet();
  const data = sheet.getDataRange().getValues();

  // ヘッダーを飛ばして逆順に検索（最新のものを優先）
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    if (row[0] === channelId && row[4] === 'warned') {
      return {
        channelId: String(row[0]),
        channelName: String(row[1]),
        warnedAt: new Date(row[2]),
        archiveScheduledAt: new Date(row[3]),
        status: row[4] as WarningStatus,
        warningMessageTs: String(row[5]),
      };
    }
  }
  return undefined;
}

/**
 * 全ての "warned" ステータスのレコードを取得する
 */
export function getAllActiveWarnings(): WarningRecord[] {
  const sheet = getOrCreateWarningLogSheet();
  const data = sheet.getDataRange().getValues();
  const records: WarningRecord[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[4] === 'warned') {
      records.push({
        channelId: String(row[0]),
        channelName: String(row[1]),
        warnedAt: new Date(row[2]),
        archiveScheduledAt: new Date(row[3]),
        status: 'warned',
        warningMessageTs: String(row[5]),
      });
    }
  }

  return records;
}

/**
 * 警告レコードを追記する
 */
export function addWarningRecord(record: WarningRecord): void {
  const sheet = getOrCreateWarningLogSheet();
  sheet.appendRow([
    record.channelId,
    record.channelName,
    record.warnedAt.toISOString(),
    record.archiveScheduledAt.toISOString(),
    record.status,
    record.warningMessageTs,
  ]);
}

/**
 * 指定チャンネルの警告レコードのステータスを更新する
 */
export function updateWarningStatus(channelId: string, newStatus: WarningStatus): void {
  const sheet = getOrCreateWarningLogSheet();
  const data = sheet.getDataRange().getValues();

  // 最新の "warned" レコードを見つけて更新
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === channelId && data[i][4] === 'warned') {
      sheet.getRange(i + 1, 5).setValue(newStatus); // E列 (status)
      Logger.log(`WarningLog 更新: ${channelId} → ${newStatus}`);
      return;
    }
  }

  Logger.log(`警告: ${channelId} の warned レコードが見つかりません`);
}
