// 모바일 메뉴
const burger = document.getElementById('burger');
const menu = document.getElementById('menu');
burger.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(open));
});
menu.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => menu.classList.remove('open'))
);

// 견적 폼 → /api/quote
const form = document.getElementById('quote');
const msg = document.getElementById('form-msg');
const submitBtn = form.querySelector('button[type="submit"]');

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
    showMessage('접수되었습니다! 곧 연락드리겠습니다.', 'ok');
    form.reset();
  } catch (err) {
    showMessage(`${err.message} 전화(1588-0000)로 문의해 주세요.`, 'err');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '견적 요청하기';
  }
});

document.getElementById('year').textContent = new Date().getFullYear();
