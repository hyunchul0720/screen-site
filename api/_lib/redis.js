// Upstash Redis REST 클라이언트 (외부 패키지 없이 fetch 사용)
// Vercel Marketplace에서 Upstash Redis를 연결하면 아래 환경변수가 자동으로 들어옵니다.
//   KV_REST_API_URL / KV_REST_API_TOKEN   또는   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN

function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

export const hasRedis = () => config() !== null;

async function call(path, body) {
  const cfg = config();
  if (!cfg) throw new Error('REDIS_NOT_CONFIGURED');
  const res = await fetch(cfg.url + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(json.error || `redis http ${res.status}`);
  return json;
}

/** 명령 하나 실행: redis('SET', 'key', 'value') */
export async function redis(...cmd) {
  const json = await call('', cmd.map(String));
  return json.result;
}

/** 여러 명령 한 번에: pipeline([['SET','a','1'], ['GET','a']]) → [result, result] */
export async function pipeline(cmds) {
  const json = await call('/pipeline', cmds.map((c) => c.map(String)));
  return json.map((r) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}
