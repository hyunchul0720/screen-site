// 견적 신청 저장소 (Redis)
//   quote:{id}  → JSON 문자열
//   quotes      → 정렬 집합(score = 접수 시각)
import { pipeline, redis } from './redis.js';

export const STATUSES = ['new', 'contacted', 'scheduled', 'done', 'canceled'];
export const ID_RE = /^[0-9a-f-]{36}$/;

const key = (id) => `quote:${id}`;

export async function saveQuote(quote) {
  await pipeline([
    ['SET', key(quote.id), JSON.stringify(quote)],
    ['ZADD', 'quotes', Date.parse(quote.receivedAt), quote.id],
  ]);
}

export async function listQuotes(limit = 1000) {
  const ids = await redis('ZRANGE', 'quotes', 0, limit - 1, 'REV');
  if (!ids || ids.length === 0) return [];
  const values = await redis('MGET', ...ids.map(key));
  return values
    .map((v) => {
      try {
        return v ? JSON.parse(v) : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function getQuote(id) {
  const raw = await redis('GET', key(id));
  return raw ? JSON.parse(raw) : null;
}

export async function updateQuote(id, patch) {
  const current = await getQuote(id);
  if (!current) return null;
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await redis('SET', key(id), JSON.stringify(next));
  return next;
}

export async function deleteQuote(id) {
  await pipeline([
    ['DEL', key(id)],
    ['ZREM', 'quotes', id],
  ]);
}
