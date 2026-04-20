/**
 * 構造化ログを出力するヘルパー
 */
export function logInfo(context: string, message: string, data?: Record<string, unknown>): void {
  const entry = `[INFO][${context}] ${message}${data ? ' | ' + JSON.stringify(data) : ''}`;
  Logger.log(entry);
}

export function logError(context: string, message: string, error?: unknown): void {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const entry = `[ERROR][${context}] ${message}${error ? ' | ' + errorMsg : ''}`;
  Logger.log(entry);
}

export function logWarn(context: string, message: string): void {
  Logger.log(`[WARN][${context}] ${message}`);
}
