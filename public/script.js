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
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('in'));
}

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
    showMessage('접수되었습니다. 곧 연락드리겠습니다.', 'ok');
    form.reset();
  } catch (err) {
    showMessage(`${err.message} 전화(1588-0000)로 문의해 주세요.`, 'err');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = submitHTML;
  }
});

document.getElementById('year').textContent = new Date().getFullYear();
