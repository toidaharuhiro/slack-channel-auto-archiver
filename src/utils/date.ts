/**
 * 2つの日付の差分を日数で返す（小数点以下切り捨て）
 */
export function daysBetween(from: Date, to: Date): number {
  const diffMs = to.getTime() - from.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * 指定日数を加算した日付を返す
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 日付を YYYY-MM-DD 形式にフォーマットする
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Slack のメッセージ ts（"1234567890.123456" 形式）をDateに変換する
 */
export function tsToDate(ts: string): Date {
  const seconds = parseFloat(ts);
  return new Date(seconds * 1000);
}
