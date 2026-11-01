// /api/admin/login
//   GET    → 로그인 상태 확인
//   POST   → { password } 로 로그인
//   DELETE → 로그아웃
import {
  checkPassword, clearCookie, clientIp, isAuthed, passwordConfigured, readBody, sessionCookie,
} from '../_lib/auth.js';
import { hasRedis, redis } from '../_lib/redis.js';

const MAX_FAILS = 10;
const LOCK_SECONDS = 15 * 60;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      authed: isAuthed(req),
      passwordConfigured: passwordConfigured(),
      db: hasRedis(),
    });
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearCookie);
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ ok: false, error: '허용되지 않은 요청입니다.' });
  }

  if (!passwordConfigured()) {
    return res.status(503).json({
      ok: false,
      error: '관리자 비밀번호가 설정되지 않았습니다. Vercel 환경변수 ADMIN_PASSWORD를 추가해 주세요.',
    });
  }

  const body = readBody(req);
  if (!body) return res.status(400).json({ ok: false, error: '잘못된 요청 형식입니다.' });

  // 로그인 실패 횟수 제한 (Redis 연결 시)
  const failKey = `login-fail:${clientIp(req)}`;
  if (hasRedis()) {
    try {
      const fails = Number(await redis('GET', failKey)) || 0;
      if (fails >= MAX_FAILS) {
        return res.status(429).json({ ok: false, error: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.' });
      }
    } catch (err) {
      console.error('[login] rate check failed', err);
    }
  }

  if (!checkPassword(body.password)) {
    if (hasRedis()) {
      try {
        await redis('INCR', failKey);
        await redis('EXPIRE', failKey, LOCK_SECONDS);
      } catch (err) {
        console.error('[login] rate record failed', err);
      }
    }
    return res.status(401).json({ ok: false, error: '비밀번호가 올바르지 않습니다.' });
  }

  if (hasRedis()) redis('DEL', failKey).catch(() => {});
  res.setHeader('Set-Cookie', sessionCookie());
  return res.status(200).json({ ok: true });
}
