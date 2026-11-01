// GET /api/settings — 홈페이지가 읽는 공개 설정 (연락처·사업자 정보)
import { loadSettings, DEFAULT_SETTINGS } from './_lib/settings.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false });
  }
  let settings = DEFAULT_SETTINGS;
  try {
    settings = await loadSettings();
  } catch (err) {
    console.error('[settings] load failed', err);
  }
  // 엣지 캐시 60초 — 관리자 화면에서 저장하면 1분 안에 반영됩니다.
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({ ok: true, settings });
}
