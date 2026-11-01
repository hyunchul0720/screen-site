// /api/admin/settings  (관리자 전용)
//   GET → 현재 설정
//   PUT → 설정 저장
import { readBody, requireAdmin } from '../_lib/auth.js';
import { hasRedis, redis } from '../_lib/redis.js';
import { loadSettings, SETTINGS_KEY, validateSettings } from '../_lib/settings.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, settings: await loadSettings(), db: hasRedis() });
    }

    if (req.method === 'PUT') {
      if (!hasRedis()) {
        return res.status(503).json({ ok: false, code: 'NO_DB', error: '데이터베이스(Upstash Redis)가 연결되지 않아 저장할 수 없습니다.' });
      }
      const body = readBody(req);
      const { settings, error } = validateSettings(body);
      if (error) return res.status(400).json({ ok: false, error });
      await redis('SET', SETTINGS_KEY, JSON.stringify(settings));
      return res.status(200).json({ ok: true, settings });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ ok: false, error: '허용되지 않은 요청입니다.' });
  } catch (err) {
    console.error('[admin/settings]', err);
    return res.status(500).json({ ok: false, error: '처리 중 오류가 발생했습니다.' });
  }
}
