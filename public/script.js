// 관리자 화면에서 바꾼 연락처·사업자 정보를 불러와 페이지에 반영
const DEFAULTS = {
  phone: '1588-0000',
  sms: '010-0000-0000',
  kakaoPrefix: 'https://pf.kakao.com/',
  blogPrefix: 'https://blog.naver.com/',
};
let contactPhone = DEFAULTS.phone;

function replaceText(from, to) {
  if (!from || !to || from === to) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeValue.includes(from)) n.nodeValue = n.nodeValue.split(from).join(to);
  }
}

async function applySettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const { settings: s } = await res.json();
    if (!s) return;
    const digits = (v) => String(v).replace(/[^0-9+]/g, '');
    if (s.phone) {
      document.querySelectorAll('a[href^="tel:"]').forEach((a) => { a.href = `tel:${digits(s.phone)}`; });
      replaceText(DEFAULTS.phone, s.phone);
      contactPhone = s.phone;
    }
    if (s.sms) {
      document.querySelectorAll('a[href^="sms:"]').forEach((a) => { a.href = `sms:${digits(s.sms)}`; });
      replaceText(DEFAULTS.sms, s.sms);
    }
    const safe = (u) => /^https:\/\//.test(u || '');
    if (safe(s.kakaoUrl)) document.querySelectorAll(`a[href^="${DEFAULTS.kakaoPrefix}"]`).forEach((a) => { a.href = s.kakaoUrl; });
    if (safe(s.blogUrl)) document.querySelectorAll(`a[href^="${DEFAULTS.blogPrefix}"]`).forEach((a) => { a.href = s.blogUrl; });
    document.querySelectorAll('[data-s]').forEach((node) => {
      const v = s[node.dataset.s];
      if (v) node.textContent = v;
    });
  } catch {
    /* 로컬 파일로 열었거나 서버 오류 — 기본값 유지 */
  }
}
if (location.protocol.startsWith('http')) applySettings();

// 헤더: 스크롤 시 테두리 표시
const header = document.getElementById('top');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// 모바일 메뉴
const burger = document.getElementById('burger');
const menu = document.getElementById('menu');
const setMenu = (open) => {
  menu.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
};
burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

// 스크롤 등장 효과
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('in'));
}

// 주택 유형 탭
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    panel.hidden = !on;
    if (on) panel.classList.add('in');
  });
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const next = tabs[(i + d + tabs.length) % tabs.length];
    selectTab(next); next.focus();
  });
});

// 상식 더보기
const guideBox = document.getElementById('guideBox');
const guideToggle = document.getElementById('guideToggle');
guideToggle.addEventListener('click', () => {
  const open = guideBox.classList.toggle('open');
  guideToggle.textContent = open ? '접기' : '더 보기';
  guideToggle.setAttribute('aria-expanded', String(open));
});

// 제품별 "견적 받기" → 품목 자동 선택
const typeSelect = document.getElementById('type');
document.querySelectorAll('[data-type]').forEach((a) =>
  a.addEventListener('click', () => { typeSelect.value = a.dataset.type; })
);

// 희망 날짜: 오늘 이전 선택 불가
const dateInput = document.getElementById('date');
const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
dateInput.min = today.toISOString().slice(0, 10);

// 견적 폼 → /api/quote
const form = document.getElementById('quote');
const msg = document.getElementById('form-msg');
const submitBtn = form.querySelector('button[type="submit"]');
const submitHTML = submitBtn.innerHTML;

function showMessage(text, type) {
  msg.textContent = text;
  msg.className = `form-msg ${type}`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  data.agree = form.agree.checked;

  submitBtn.disabled = true;
  submitBtn.textContent = '전송 중…';
  msg.className = 'form-msg';

  try {
    const res = await fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) throw new Error(json.error || '전송에 실패했습니다.');
    showMessage('신청되었습니다. 확인 후 바로 연락드리겠습니다.', 'ok');
    form.reset();
  } catch (err) {
    showMessage(`${err.message} 전화(${contactPhone})나 카카오톡으로 문의해 주세요.`, 'err');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = submitHTML;
  }
});

document.getElementById('year').textContent = new Date().getFullYear();
