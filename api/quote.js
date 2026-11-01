// Vercel Serverless Function: POST /api/quote
// 견적 신청을 받아 검증한 뒤
//   1) Redis가 연결돼 있으면 저장 (관리자 페이지에서 확인)
//   2) QUOTE_WEBHOOK_URL이 있으면 Slack/Discord/Make 등으로 알림
// 둘 다 없으면 Vercel 함수 로그에만 기록합니다.
import crypto from 'node:crypto';
import { hasRedis } from './_lib/redis.js';
import { saveQuote } from './_lib/quotes.js';

const MAX_LEN = { name: 40, phone: 20, type: 40, count: 3, address: 100, date: 10, time: 20, message: 1000 };

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: '허용되지 않은 요청입니다.' });
  }

  let body = req.body ?? {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      return res.status(400).json({ ok: false, error: '잘못된 요청 형식입니다.' });
    }
  }

  // 스팸 봇 차단용 숨김 필드 — 값이 있으면 조용히 성공 처리
  if (body.website) return res.status(200).json({ ok: true });

  const entry = Object.fromEntries(
    Object.entries(MAX_LEN).map(([key, max]) => [key, clean(body[key], max)])
  );

  if (!entry.name) return res.status(400).json({ ok: false, error: '이름을 입력해 주세요.' });
  if (!/^[0-9+\-\s()]{8,20}$/.test(entry.phone)) {
    return res.status(400).json({ ok: false, error: '연락처를 정확히 입력해 주세요.' });
  }
  if (!entry.address) return res.status(400).json({ ok: false, error: '주소를 입력해 주세요.' });
  if (entry.date && !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) entry.date = '';
  if (entry.count && !/^\d{1,2}$/.test(entry.count)) entry.count = '';
  if (body.agree !== true) {
    return res.status(400).json({ ok: false, error: '개인정보 수집에 동의해 주세요.' });
  }

  const quote = {
    id: crypto.randomUUID(),
    ...entry,
    status: 'new',
    memo: '',
    receivedAt: new Date().toISOString(),
  };

  const text =
    `📩 [더푸른홈케어] 새 견적 신청\n` +
    `• 이름: ${quote.name}\n` +
    `• 연락처: ${quote.phone}\n` +
    `• 품목: ${quote.type || '-'}${quote.count ? ` (창 ${quote.count}개)` : ''}\n` +
    `• 주소: ${quote.address}\n` +
    `• 희망 일시: ${quote.date || '날짜 무관'} / ${quote.time || '시간 무관'}\n` +
    `• 요청사항: ${quote.message || '-'}`;

  const webhook = process.env.QUOTE_WEBHOOK_URL;
  let delivered = 0;
  let attempted = 0;

  if (hasRedis()) {
    attempted++;
    try {
      await saveQuote(quote);
      delivered++;
    } catch (err) {
      console.error('[quote] redis save failed', err);
    }
  }

  if (webhook) {
    attempted++;
    try {
      const r = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // text: Slack, content: Discord, 나머지 필드: Make/Zapier 등에서 활용
        body: JSON.stringify({ text, content: text, ...quote }),
      });
      if (!r.ok) throw new Error(`webhook responded ${r.status}`);
      delivered++;
    } catch (err) {
      console.error('[quote] webhook failed', err);
    }
  }

  if (attempted === 0) console.log('[quote]', JSON.stringify(quote));

  if (attempted > 0 && delivered === 0) {
    return res.status(502).json({ ok: false, error: '일시적인 오류로 접수하지 못했습니다.' });
  }
  return res.status(200).json({ ok: true });
}
