// Vercel Serverless Function: POST /api/quote
// 견적 요청을 받아 검증한 뒤, QUOTE_WEBHOOK_URL 환경변수가 있으면 그곳으로 전달합니다.
// (Slack Incoming Webhook / Discord Webhook / Make·Zapier 웹훅 등)
// 환경변수가 없으면 Vercel 함수 로그에만 기록합니다.

const MAX_LEN = { name: 40, phone: 20, type: 40, area: 60, message: 1000 };

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

  const entry = {
    name: clean(body.name, MAX_LEN.name),
    phone: clean(body.phone, MAX_LEN.phone),
    type: clean(body.type, MAX_LEN.type),
    area: clean(body.area, MAX_LEN.area),
    message: clean(body.message, MAX_LEN.message),
    receivedAt: new Date().toISOString(),
  };

  if (!entry.name) return res.status(400).json({ ok: false, error: '이름을 입력해 주세요.' });
  if (!/^[0-9+\-\s()]{8,20}$/.test(entry.phone)) {
    return res.status(400).json({ ok: false, error: '연락처를 정확히 입력해 주세요.' });
  }
  if (body.agree !== true) {
    return res.status(400).json({ ok: false, error: '개인정보 수집에 동의해 주세요.' });
  }

  const text =
    `📩 [럭키방충망] 새 견적 요청\n` +
    `• 이름: ${entry.name}\n` +
    `• 연락처: ${entry.phone}\n` +
    `• 품목: ${entry.type || '-'}\n` +
    `• 지역: ${entry.area || '-'}\n` +
    `• 요청사항: ${entry.message || '-'}`;

  const webhook = process.env.QUOTE_WEBHOOK_URL;
  try {
    if (webhook) {
      const r = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // text: Slack, content: Discord, 나머지 필드: Make/Zapier 등에서 활용
        body: JSON.stringify({ text, content: text, ...entry }),
      });
      if (!r.ok) throw new Error(`webhook responded ${r.status}`);
    } else {
      console.log('[quote]', JSON.stringify(entry));
    }
  } catch (err) {
    console.error('[quote] forward failed', err);
    return res.status(502).json({ ok: false, error: '일시적인 오류로 접수하지 못했습니다.' });
  }

  return res.status(200).json({ ok: true });
}
