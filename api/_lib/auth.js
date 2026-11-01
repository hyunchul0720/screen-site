// 관리자 인증: ADMIN_PASSWORD 환경변수 + 서명된 HttpOnly 쿠키
import crypto from 'node:crypto';

const COOKIE = 'lucky_admin';
const TTL = 12 * 60 * 60; // 12시간

const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest();

// 비밀번호가 바뀌면 서명 키도 바뀌어 기존 로그인이 모두 풀립니다.
function secret() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return process.env.ADMIN_SESSION_SECRET || sha256(`lucky-admin|${pw}`).toString('hex');
}

const sign = (value) => crypto.createHmac('sha256', secret()).update(value).digest('base64url');

export const passwordConfigured = () => Boolean(process.env.ADMIN_PASSWORD);

export function checkPassword(input) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || typeof input !== 'string') return false;
  return crypto.timingSafeEqual(sha256(input), sha256(pw));
}

export function sessionCookie() {
  const exp = String(Math.floor(Date.now() / 1000) + TTL);
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL}`;
}

export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function isAuthed(req) {
  if (!secret()) return false;
  const pair = String(req.headers.cookie || '')
    .split(/;\s*/)
    .find((c) => c.startsWith(`${COOKIE}=`));
  if (!pair) return false;
  const [exp, sig] = pair.slice(COOKIE.length + 1).split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/** 관리자 API 공통 가드. false면 이미 응답을 보낸 상태입니다. */
export function requireAdmin(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) {
    res.status(401).json({ ok: false, error: '로그인이 필요합니다.' });
    return false;
  }
  return true;
}

export function readBody(req) {
  const body = req.body ?? {};
  if (typeof body !== 'string') return body;
  try {
    return JSON.parse(body || '{}');
  } catch {
    return null;
  }
}

export function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
}
