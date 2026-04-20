/**
 * GAS のグローバルオブジェクトをモックする。
 * テスト実行時にのみ使用。
 */

// Logger モック
(globalThis as Record<string, unknown>).Logger = {
  log: jest.fn(),
};

// Utilities モック
(globalThis as Record<string, unknown>).Utilities = {
  sleep: jest.fn(),
};

// LockService モック
(globalThis as Record<string, unknown>).LockService = {
  getScriptLock: jest.fn(() => ({
    tryLock: jest.fn(() => true),
    releaseLock: jest.fn(),
  })),
};

// PropertiesService モック
const scriptProperties: Record<string, string> = {
  SLACK_BOT_TOKEN: 'xoxb-test-token-12345',
};

(globalThis as Record<string, unknown>).PropertiesService = {
  getScriptProperties: jest.fn(() => ({
    getProperty: jest.fn((key: string) => scriptProperties[key] ?? null),
    setProperty: jest.fn((key: string, value: string) => {
      scriptProperties[key] = value;
    }),
    deleteProperty: jest.fn((key: string) => {
      delete scriptProperties[key];
    }),
  })),
};

// SpreadsheetApp モック（最低限）
(globalThis as Record<string, unknown>).SpreadsheetApp = {
  getActiveSpreadsheet: jest.fn(() => ({
    getSheetByName: jest.fn(() => null),
    insertSheet: jest.fn(() => ({
      appendRow: jest.fn(),
      getDataRange: jest.fn(() => ({
        getValues: jest.fn(() => []),
      })),
    })),
  })),
};

// ScriptApp モック
(globalThis as Record<string, unknown>).ScriptApp = {
  getProjectTriggers: jest.fn(() => []),
  deleteTrigger: jest.fn(),
  newTrigger: jest.fn(() => ({
    timeBased: jest.fn(function (this: Record<string, unknown>) { return this; }),
    everyDays: jest.fn(function (this: Record<string, unknown>) { return this; }),
    atHour: jest.fn(function (this: Record<string, unknown>) { return this; }),
    create: jest.fn(),
  })),
};

// UrlFetchApp モック
(globalThis as Record<string, unknown>).UrlFetchApp = {
  fetch: jest.fn(),
};
