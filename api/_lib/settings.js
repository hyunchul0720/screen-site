// 사이트 설정 (관리자 화면에서 수정 → 홈페이지에 반영)
import { hasRedis, redis } from './redis.js';

export const SETTINGS_KEY = 'settings';

export const DEFAULT_SETTINGS = {
  phone: '1588-0000',
  sms: '010-0000-0000',
  kakaoUrl: 'https://pf.kakao.com/_XXXXXX',
  blogUrl: 'https://blog.naver.com/',
  hours: '평일 08:00–20:00 · 주말 09:00–18:00',
  ceo: 'OOO',
  bizNo: '000-00-00000',
  address: '서울특별시 OO구 OO로 00',
};

const PHONE_RE = /^[0-9+\-\s()]{3,20}$/;

function validUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && v.length <= 200;
  } catch {
    return false;
  }
}

const RULES = {
  phone: (v) => PHONE_RE.test(v) || '대표전화 형식이 올바르지 않습니다.',
  sms: (v) => PHONE_RE.test(v) || '문자 번호 형식이 올바르지 않습니다.',
  kakaoUrl: (v) => validUrl(v) || '카카오톡 주소는 https:// 로 시작해야 합니다.',
  blogUrl: (v) => validUrl(v) || '블로그 주소는 https:// 로 시작해야 합니다.',
  hours: (v) => v.length <= 100 || '상담시간은 100자 이내로 입력해 주세요.',
  ceo: (v) => v.length <= 30 || '대표자명은 30자 이내로 입력해 주세요.',
  bizNo: (v) => v.length <= 30 || '사업자등록번호는 30자 이내로 입력해 주세요.',
  address: (v) => v.length <= 120 || '주소는 120자 이내로 입력해 주세요.',
};

/** 입력값 검증. { settings } 또는 { error } 반환 */
export function validateSettings(input) {
  const out = {};
  for (const [key, rule] of Object.entries(RULES)) {
    const v = String(input?.[key] ?? '').trim();
    if (!v) return { error: '모든 항목을 입력해 주세요.' };
    const r = rule(v);
    if (r !== true) return { error: r };
    out[key] = v;
  }
  return { settings: out };
}

export async function loadSettings() {
  if (!hasRedis()) return { ...DEFAULT_SETTINGS };
  const raw = await redis('GET', SETTINGS_KEY);
  let saved = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch {
    saved = {};
  }
  return { ...DEFAULT_SETTINGS, ...saved };
}
