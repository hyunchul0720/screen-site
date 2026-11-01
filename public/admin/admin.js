// 더푸른홈케어 관리자 — 고객이 입력한 값은 항상 textContent로만 화면에 넣습니다(XSS 방지).

const STATUS = {
  new:       { label: '신규',     c: 'var(--s-new)',       cb: 'var(--s-new-bg)' },
  contacted: { label: '연락완료', c: 'var(--s-contacted)', cb: 'var(--s-contacted-bg)' },
  scheduled: { label: '시공예약', c: 'var(--s-scheduled)', cb: 'var(--s-scheduled-bg)' },
  done:      { label: '시공완료', c: 'var(--s-done)',      cb: 'var(--s-done-bg)' },
  canceled:  { label: '취소',     c: 'var(--s-canceled)',  cb: 'var(--s-canceled-bg)' },
};

const $ = (id) => document.getElementById(id);
const state = { quotes: [], filter: 'all', query: '', current: null };

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style') node.style.cssText = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/admin/login') {
    showLogin('로그인 시간이 만료되었습니다. 다시 로그인해 주세요.');
    throw new Error('unauthorized');
  }
  if (!res.ok || json.ok === false) {
    const err = new Error(json.error || `요청 실패 (${res.status})`);
    err.code = json.code;
    throw err;
  }
  return json;
}

function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

const pad = (n) => String(n).padStart(2, '0');
function fmtDate(iso, withYear = false) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const base = `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return withYear ? `${d.getFullYear()}.${base}` : base;
}
const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();
const telHref = (p) => `tel:${String(p).replace(/[^0-9+]/g, '')}`;
const wishText = (q) => [q.date, q.time].filter(Boolean).join(' · ') || '일정 무관';

function badge(status) {
  const s = STATUS[status] || STATUS.new;
  return el('span', { class: 'badge', style: `--c:${s.c};--cb:${s.cb}` }, s.label);
}

/* ---------------- 화면 전환 ---------------- */
function showLogin(message = '') {
  $('view-app').hidden = true;
  $('view-login').hidden = false;
  const msg = $('login-msg');
  msg.textContent = message;
  msg.className = message ? 'msg err' : 'msg';
  $('pw').focus();
}

async function showApp(db) {
  $('view-login').hidden = true;
  $('view-app').hidden = false;
  $('db-banner').hidden = db;
  await loadQuotes();
}

function switchView(name) {
  document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === name)));
  $('view-quotes').hidden = name !== 'quotes';
  $('view-settings').hidden = name !== 'settings';
  if (name === 'settings') loadSettings();
}

/* ---------------- 견적 ---------------- */
async function loadQuotes() {
  try {
    const { quotes } = await api('/api/admin/quotes');
    state.quotes = quotes;
    $('db-banner').hidden = true;
  } catch (err) {
    if (err.code === 'NO_DB') $('db-banner').hidden = false;
    else if (err.message !== 'unauthorized') toast(err.message);
    state.quotes = [];
  }
  render();
}

function filtered() {
  const q = state.query.trim().toLowerCase();
  const qDigits = q.replace(/[^0-9]/g, '');
  return state.quotes.filter((item) => {
    if (state.filter === 'today' && !isToday(item.receivedAt)) return false;
    if (!['all', 'today'].includes(state.filter) && item.status !== state.filter) return false;
    if (!q) return true;
    const hay = `${item.name} ${item.address} ${item.type} ${item.message} ${item.memo}`.toLowerCase();
    return hay.includes(q) || (qDigits.length >= 3 && String(item.phone).replace(/[^0-9]/g, '').includes(qDigits));
  });
}

function renderStats() {
  const count = (fn) => state.quotes.filter(fn).length;
  const cards = [
    { key: 'all', label: '전체', n: state.quotes.length },
    { key: 'today', label: '오늘 접수', n: count((q) => isToday(q.receivedAt)) },
    ...['new', 'contacted', 'scheduled', 'done'].map((k) => ({
      key: k, label: STATUS[k].label, n: count((q) => q.status === k), c: STATUS[k].c,
    })),
  ];
  $('stats').replaceChildren(
    ...cards.map((c) =>
      el('button', {
        class: 'stat', type: 'button', 'aria-pressed': String(state.filter === c.key),
        style: c.c ? `--c:${c.c}` : null,
        onclick: () => { state.filter = state.filter === c.key ? 'all' : c.key; render(); },
      }, el('span', {}, c.c ? el('i') : null, c.label), el('strong', {}, c.n))
    )
  );
  const nNew = count((q) => q.status === 'new');
  $('new-count').hidden = nNew === 0;
  $('new-count').textContent = nNew;
}

function renderList() {
  const rows = filtered();
  $('empty').hidden = rows.length > 0;
  $('list').hidden = rows.length === 0;
  const head = el('div', { class: 'row head' },
    el('div', {}, '접수'), el('div', {}, '상태'), el('div', {}, '이름'), el('div', {}, '연락처'),
    el('div', {}, '주소'), el('div', {}, '품목 · 희망일'), el('div'));
  $('list').replaceChildren(head, ...rows.map((q) =>
    el('div', {
      class: `row${q.status === 'new' ? ' is-new' : ''}`, tabindex: '0', role: 'button',
      onclick: (e) => { if (!e.target.closest('a')) openDetail(q.id); },
      onkeydown: (e) => { if (e.key === 'Enter') openDetail(q.id); },
    },
      el('div', { class: 'when' }, fmtDate(q.receivedAt)),
      el('div', { class: 'status' }, badge(q.status)),
      el('div', { class: 'name' }, q.name),
      el('div', { class: 'phone' }, el('a', { href: telHref(q.phone) }, q.phone)),
      el('div', { class: 'addr', title: q.address }, q.address),
      el('div', { class: 'type wish' }, q.type || '-', q.count ? el('small', {}, ` · ${q.count}개`) : null,
        el('br'), el('small', {}, wishText(q))),
      q.memo ? el('i', { class: 'memo-dot', title: '메모 있음' }) : el('i')
    )
  ));
}

function render() {
  renderStats();
  renderList();
}

/* ---------------- 상세 ---------------- */
const dialog = $('detail');
Object.entries(STATUS).forEach(([k, s]) => $('d-status').append(el('option', { value: k }, s.label)));

function openDetail(id) {
  const q = state.quotes.find((x) => x.id === id);
  if (!q) return;
  state.current = q;
  $('d-title').textContent = `${q.name} 님 견적`;
  const fields = [
    ['접수', fmtDate(q.receivedAt, true)],
    ['연락처', el('a', { href: telHref(q.phone) }, q.phone)],
    ['품목', `${q.type || '-'}${q.count ? ` · 창 ${q.count}개` : ''}`],
    ['주소', q.address],
    ['희망 일시', wishText(q)],
    ['요청 사항', q.message || '-'],
  ];
  if (q.updatedAt) fields.push(['최근 수정', fmtDate(q.updatedAt, true)]);
  $('d-fields').replaceChildren(...fields.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]));
  $('d-status').value = q.status || 'new';
  $('d-memo').value = q.memo || '';
  $('d-msg').textContent = '';
  dialog.showModal();
}

$('d-save').addEventListener('click', async () => {
  const q = state.current;
  if (!q) return;
  const btn = $('d-save');
  btn.disabled = true;
  try {
    const { quote } = await api('/api/admin/quotes', {
      method: 'PATCH',
      body: JSON.stringify({ id: q.id, status: $('d-status').value, memo: $('d-memo').value }),
    });
    state.quotes = state.quotes.map((x) => (x.id === quote.id ? quote : x));
    render();
    dialog.close();
    toast('저장했습니다.');
  } catch (err) {
    $('d-msg').textContent = err.message;
    $('d-msg').className = 'msg err';
  } finally {
    btn.disabled = false;
  }
});

$('d-delete').addEventListener('click', async () => {
  const q = state.current;
  if (!q || !confirm(`${q.name} 님의 견적을 삭제할까요? 되돌릴 수 없습니다.`)) return;
  try {
    await api('/api/admin/quotes', { method: 'DELETE', body: JSON.stringify({ id: q.id }) });
    state.quotes = state.quotes.filter((x) => x.id !== q.id);
    render();
    dialog.close();
    toast('삭제했습니다.');
  } catch (err) {
    $('d-msg').textContent = err.message;
    $('d-msg').className = 'msg err';
  }
});

/* ---------------- CSV ---------------- */
function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // 엑셀 수식 실행 방지
  return `"${s.replace(/"/g, '""')}"`;
}

$('export').addEventListener('click', () => {
  const rows = filtered();
  if (rows.length === 0) return toast('내보낼 견적이 없습니다.');
  const header = ['접수일시', '상태', '이름', '연락처', '품목', '창 개수', '주소', '희망 날짜', '희망 시간', '요청 사항', '메모'];
  const lines = rows.map((q) => [
    fmtDate(q.receivedAt, true), STATUS[q.status]?.label, q.name, q.phone, q.type, q.count,
    q.address, q.date, q.time, q.message, q.memo,
  ].map(csvCell).join(','));
  const blob = new Blob(['﻿' + [header.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `견적목록_${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

/* ---------------- 설정 ---------------- */
async function loadSettings() {
  const form = $('settings-form');
  try {
    const { settings } = await api('/api/admin/settings');
    for (const [k, v] of Object.entries(settings)) if (form.elements[k]) form.elements[k].value = v;
  } catch (err) {
    if (err.message !== 'unauthorized') toast(err.message);
  }
}

$('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg = $('settings-msg');
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  msg.className = 'msg';
  msg.textContent = '저장 중…';
  try {
    await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    msg.className = 'msg ok';
    msg.textContent = '저장했습니다. 1분 안에 홈페이지에 반영됩니다.';
  } catch (err) {
    msg.className = 'msg err';
    msg.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

/* ---------------- 로그인 ---------------- */
$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  try {
    await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('pw').value }) });
    $('pw').value = '';
    const status = await api('/api/admin/login');
    await showApp(status.db);
  } catch (err) {
    $('login-msg').textContent = err.message;
    $('login-msg').className = 'msg err';
  } finally {
    btn.disabled = false;
  }
});

$('logout').addEventListener('click', async () => {
  await api('/api/admin/login', { method: 'DELETE' }).catch(() => {});
  state.quotes = [];
  showLogin('로그아웃했습니다.');
  $('login-msg').className = 'msg';
});

/* ---------------- 시작 ---------------- */
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));
$('search').addEventListener('input', (e) => { state.query = e.target.value; renderList(); });
$('refresh').addEventListener('click', async () => { await loadQuotes(); toast('새로고침했습니다.'); });

// 화면을 켜 두면 1분마다 새 견적 확인
setInterval(() => {
  if (!$('view-app').hidden && !$('view-quotes').hidden && !dialog.open && document.visibilityState === 'visible') loadQuotes();
}, 60_000);

(async () => {
  try {
    const status = await api('/api/admin/login');
    if (!status.passwordConfigured) {
      showLogin('관리자 비밀번호가 아직 설정되지 않았습니다. Vercel 환경변수 ADMIN_PASSWORD를 추가해 주세요.');
    } else if (status.authed) {
      await showApp(status.db);
    } else {
      showLogin();
    }
  } catch {
    showLogin('서버에 연결할 수 없습니다. 배포된 사이트(또는 vercel dev)에서 열어 주세요.');
  }
})();
