// /api/admin/quotes  (관리자 전용)
//   GET    → 견적 목록
//   PATCH  → { id, status?, memo? } 상태·메모 수정
//   DELETE → { id } 삭제
import { readBody, requireAdmin } from '../_lib/auth.js';
import { hasRedis } from '../_lib/redis.js';
import { deleteQuote, ID_RE, listQuotes, STATUSES, updateQuote } from '../_lib/quotes.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (!hasRedis()) {
    return res.status(503).json({ ok: false, code: 'NO_DB', error: '데이터베이스(Upstash Redis)가 연결되지 않았습니다.' });
  }

  try {
    if (req.method === 'GET') {
      const quotes = await listQuotes();
      return res.status(200).json({ ok: true, quotes });
    }

    const body = readBody(req);
    if (!body || !ID_RE.test(String(body.id || ''))) {
      return res.status(400).json({ ok: false, error: '잘못된 요청입니다.' });
    }

    if (req.method === 'PATCH') {
      const patch = {};
      if (body.status !== undefined) {
        if (!STATUSES.includes(body.status)) return res.status(400).json({ ok: false, error: '알 수 없는 상태입니다.' });
        patch.status = body.status;
      }
      if (body.memo !== undefined) patch.memo = String(body.memo).slice(0, 2000);
      const quote = await updateQuote(body.id, patch);
      if (!quote) return res.status(404).json({ ok: false, error: '견적을 찾을 수 없습니다.' });
      return res.status(200).json({ ok: true, quote });
    }

    if (req.method === 'DELETE') {
      await deleteQuote(body.id);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ ok: false, error: '허용되지 않은 요청입니다.' });
  } catch (err) {
    console.error('[admin/quotes]', err);
    return res.status(500).json({ ok: false, error: '처리 중 오류가 발생했습니다.' });
  }
}
