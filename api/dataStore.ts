// 内存数据存储 - 用于临时保存上传的原始数据和清洗后的数据
// 使用 Map 实现基于 sessionKey 的快速查找

export interface DataFrame {
  columns: string[];
  data: Record<string, string | number | null>[];
  rowCount: number;
  colCount: number;
  columnTypes: Record<string, string>;
}

interface SessionData {
  original: DataFrame | null;
  cleaned: DataFrame | null;
  cleanedLog: string[];
  stats: Record<string, unknown> | null;
  predictions: Record<string, unknown> | null;
  createdAt: number;
}

// 内存存储
const store = new Map<string, SessionData>();

// 自动清理过期数据（30分钟后）
const CLEANUP_INTERVAL = 30 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [key, session] of store.entries()) {
    if (now - session.createdAt > CLEANUP_INTERVAL) {
      store.delete(key);
    }
  }
}

setInterval(cleanup, 60 * 1000);

export function createSession(sessionKey: string): SessionData {
  const session: SessionData = {
    original: null,
    cleaned: null,
    cleanedLog: [],
    stats: null,
    predictions: null,
    createdAt: Date.now(),
  };
  store.set(sessionKey, session);
  return session;
}

export function getSession(sessionKey: string): SessionData | undefined {
  return store.get(sessionKey);
}

export function setOriginalData(sessionKey: string, data: DataFrame): void {
  const session = store.get(sessionKey);
  if (session) {
    session.original = data;
    session.cleaned = null;
    session.cleanedLog = [];
    session.stats = null;
    session.predictions = null;
  }
}

export function setCleanedData(sessionKey: string, data: DataFrame, log: string[]): void {
  const session = store.get(sessionKey);
  if (session) {
    session.cleaned = data;
    session.cleanedLog = log;
  }
}

export function setStats(sessionKey: string, stats: Record<string, unknown>): void {
  const session = store.get(sessionKey);
  if (session) {
    session.stats = stats;
  }
}

export function setPredictions(sessionKey: string, predictions: Record<string, unknown>): void {
  const session = store.get(sessionKey);
  if (session) {
    session.predictions = predictions;
  }
}

export function deleteSession(sessionKey: string): boolean {
  return store.delete(sessionKey);
}
