export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

let currentLevel: LogLevel = parseLevel(process.env['MalamUTE_LOG_LEVEL'] ?? 'info');

function parseLevel(s: string): LogLevel {
  if (s in LEVELS) return s as LogLevel;
  return 'info';
}

export function setLevel(level: LogLevel): void {
  currentLevel = level;
}

function log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < LEVELS[currentLevel]) return;
  const entry = { ts: new Date().toISOString(), level, msg, ...meta };
  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

export function debug(msg: string, meta?: Record<string, unknown>): void {
  log('debug', msg, meta);
}
export function info(msg: string, meta?: Record<string, unknown>): void {
  log('info', msg, meta);
}
export function warn(msg: string, meta?: Record<string, unknown>): void {
  log('warn', msg, meta);
}
export function error(msg: string, meta?: Record<string, unknown>): void {
  log('error', msg, meta);
}

export const logger = { setLevel, debug, info, warn, error };
