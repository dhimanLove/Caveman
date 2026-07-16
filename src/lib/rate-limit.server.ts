const WINDOW_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 10 * 60 * 60 * 1000;
const MAX_COUNT = 10;

interface UsageRecord {
  count: number;
  windowStart: number;
  cooldownEnd: number;
  lastGen: number;
}

const store = new Map<string, UsageRecord>();

export function checkRateLimit(uid: string): {
  allowed: boolean;
  remaining: number;
  cooldownEnd: number;
} {
  const now = Date.now();
  let record = store.get(uid);

  if (!record) {
    record = { count: 1, windowStart: now, cooldownEnd: 0, lastGen: now };
    store.set(uid, record);
    return { allowed: true, remaining: MAX_COUNT - 1, cooldownEnd: 0 };
  }

  if (record.cooldownEnd > now) {
    return { allowed: false, remaining: 0, cooldownEnd: record.cooldownEnd };
  }

  if (now - record.windowStart >= WINDOW_MS) {
    record.count = 1;
    record.windowStart = now;
    record.cooldownEnd = 0;
    record.lastGen = now;
    return { allowed: true, remaining: MAX_COUNT - 1, cooldownEnd: 0 };
  }

  if (record.count >= MAX_COUNT) {
    record.cooldownEnd = now + COOLDOWN_MS;
    return { allowed: false, remaining: 0, cooldownEnd: record.cooldownEnd };
  }

  record.count++;
  record.lastGen = now;
  return { allowed: true, remaining: MAX_COUNT - record.count, cooldownEnd: 0 };
}

export function decrementCount(uid: string): void {
  const record = store.get(uid);
  if (record && record.count > 0) {
    record.count--;
  }
}

export function getUsage(uid: string): { count: number; remaining: number; windowStart: number; cooldownEnd: number } {
  const record = store.get(uid);
  const now = Date.now();
  if (!record) {
    return { count: 0, remaining: MAX_COUNT, windowStart: 0, cooldownEnd: 0 };
  }
  if (record.cooldownEnd > now) {
    return { count: MAX_COUNT, remaining: 0, windowStart: record.windowStart, cooldownEnd: record.cooldownEnd };
  }
  if (now - record.windowStart >= WINDOW_MS) {
    return { count: 0, remaining: MAX_COUNT, windowStart: 0, cooldownEnd: 0 };
  }
  return { count: record.count, remaining: MAX_COUNT - record.count, windowStart: record.windowStart, cooldownEnd: 0 };
}
