import { daysBetween, addDays, formatDate, tsToDate } from '../src/utils/date';

describe('daysBetween', () => {
  test('同日は0日', () => {
    const d = new Date('2026-01-15');
    expect(daysBetween(d, d)).toBe(0);
  });

  test('1日差', () => {
    const from = new Date('2026-01-15T00:00:00Z');
    const to = new Date('2026-01-16T00:00:00Z');
    expect(daysBetween(from, to)).toBe(1);
  });

  test('180日差', () => {
    const from = new Date('2025-07-17T00:00:00Z');
    const to = new Date('2026-01-13T00:00:00Z');
    expect(daysBetween(from, to)).toBe(180);
  });

  test('半端な時間は切り捨て', () => {
    const from = new Date('2026-01-15T00:00:00Z');
    const to = new Date('2026-01-16T12:00:00Z');
    expect(daysBetween(from, to)).toBe(1);
  });
});

describe('addDays', () => {
  test('2日加算', () => {
    const d = new Date('2026-04-11T09:00:00Z');
    const result = addDays(d, 2);
    expect(result.toISOString()).toBe('2026-04-13T09:00:00.000Z');
  });

  test('元の日付は変更されない', () => {
    const d = new Date('2026-04-11T09:00:00Z');
    addDays(d, 5);
    expect(d.toISOString()).toBe('2026-04-11T09:00:00.000Z');
  });
});

describe('formatDate', () => {
  test('YYYY-MM-DD 形式', () => {
    const d = new Date('2026-04-13T09:00:00Z');
    expect(formatDate(d)).toBe('2026-04-13');
  });

  test('月・日が1桁の場合ゼロパディング', () => {
    const d = new Date('2026-01-05T00:00:00Z');
    expect(formatDate(d)).toBe('2026-01-05');
  });
});

describe('tsToDate', () => {
  test('Slack ts を Date に変換', () => {
    const ts = '1712991600.000000'; // 2024-04-13 09:00:00 UTC 付近
    const result = tsToDate(ts);
    expect(result instanceof Date).toBe(true);
    expect(result.getTime()).toBe(1712991600000);
  });
});
