import { isExcluded, assessChannel } from '../src/services/channel-checker';
import { SlackChannel, AppConfig, WarningRecord } from '../src/types';

/** テスト用のデフォルト設定 */
const defaultConfig: AppConfig = {
  archiveThresholdDays: 180,
  warningDaysBefore: 2,
  excludedChannelIds: ['C_EXCLUDED_1'],
  excludedPrefixes: ['proj-', 'dept-'],
  warningMessageTemplate: 'test',
  dryRun: false,
  slackBotToken: 'xoxb-test',
};

/** テスト用チャンネル生成ヘルパー */
function makeChannel(overrides: Partial<SlackChannel> = {}): SlackChannel {
  return {
    id: 'C_TEST_001',
    name: 'test-channel',
    is_archived: false,
    is_general: false,
    created: Math.floor(Date.now() / 1000) - 365 * 86400,
    num_members: 5,
    ...overrides,
  };
}

describe('isExcluded', () => {
  test('#general は常に除外される', () => {
    const ch = makeChannel({ is_general: true, name: 'general' });
    expect(isExcluded(ch, defaultConfig)).toBe(true);
  });

  test('除外チャンネルIDに含まれるチャンネルは除外される', () => {
    const ch = makeChannel({ id: 'C_EXCLUDED_1' });
    expect(isExcluded(ch, defaultConfig)).toBe(true);
  });

  test('除外プレフィックスに一致するチャンネルは除外される', () => {
    const ch1 = makeChannel({ name: 'proj-alpha' });
    const ch2 = makeChannel({ name: 'dept-engineering' });
    expect(isExcluded(ch1, defaultConfig)).toBe(true);
    expect(isExcluded(ch2, defaultConfig)).toBe(true);
  });

  test('除外条件に該当しないチャンネルは除外されない', () => {
    const ch = makeChannel({ name: 'random-talk' });
    expect(isExcluded(ch, defaultConfig)).toBe(false);
  });
});

describe('assessChannel', () => {
  const now = new Date('2026-04-13T09:00:00Z');

  /** N日前のUNIXタイムスタンプを返す */
  function daysAgoTs(days: number): number {
    return (now.getTime() - days * 86400 * 1000) / 1000;
  }

  test('活動が閾値未満のチャンネルは action=none', () => {
    const result = assessChannel(
      makeChannel(),
      daysAgoTs(90), // 90日前
      defaultConfig,
      undefined,
      false,
      now
    );
    expect(result.action).toBe('none');
    expect(result.daysSinceLastActivity).toBe(90);
  });

  test('閾値-2日（警告ゾーン）に入り、警告なしなら action=warn', () => {
    const result = assessChannel(
      makeChannel(),
      daysAgoTs(178), // 178日前 = 180-2 の警告ゾーン
      defaultConfig,
      undefined,
      false,
      now
    );
    expect(result.action).toBe('warn');
  });

  test('閾値超過 & 警告済み & アクションなし → action=archive', () => {
    const warning: WarningRecord = {
      channelId: 'C_TEST_001',
      channelName: 'test-channel',
      warnedAt: new Date('2026-04-11T09:00:00Z'),
      archiveScheduledAt: new Date('2026-04-13T09:00:00Z'),
      status: 'warned',
      warningMessageTs: '1234567890.000001',
    };

    const result = assessChannel(
      makeChannel(),
      daysAgoTs(181), // 181日前
      defaultConfig,
      warning,
      false, // アクションなし
      now
    );
    expect(result.action).toBe('archive');
  });

  test('閾値超過 & 警告済み & アクションあり → action=cancel_warning', () => {
    const warning: WarningRecord = {
      channelId: 'C_TEST_001',
      channelName: 'test-channel',
      warnedAt: new Date('2026-04-11T09:00:00Z'),
      archiveScheduledAt: new Date('2026-04-13T09:00:00Z'),
      status: 'warned',
      warningMessageTs: '1234567890.000001',
    };

    const result = assessChannel(
      makeChannel(),
      daysAgoTs(181),
      defaultConfig,
      warning,
      true, // アクションあり
      now
    );
    expect(result.action).toBe('cancel_warning');
  });

  test('閾値超過 & 警告なし → まず警告を出す（action=warn）', () => {
    const result = assessChannel(
      makeChannel(),
      daysAgoTs(200), // 200日前、警告なし
      defaultConfig,
      undefined,
      false,
      now
    );
    expect(result.action).toBe('warn');
  });

  test('メッセージなし（lastActivityTs=null）の場合、チャンネル作成日が基準になる', () => {
    const ch = makeChannel({
      created: Math.floor(daysAgoTs(200)), // 200日前に作成
    });

    const result = assessChannel(
      ch,
      null, // メッセージなし
      defaultConfig,
      undefined,
      false,
      now
    );
    expect(result.daysSinceLastActivity).toBe(200);
    expect(result.action).toBe('warn');
  });
});
