/**
 * SmartRec — Piti Chatbot Modülü
 */
import { Auth } from './auth.js';

export function initPiti() {
  const modal   = document.getElementById('chatbotModal');
  const fab     = document.getElementById('chatbotFab');
  const navBtn  = document.getElementById('openPiti');
  const closeBtn = document.getElementById('chatbotClose');
  const input   = document.getElementById('chatbotInput');
  const sendBtn = document.getElementById('chatbotSend');
  const body    = document.getElementById('chatbotBody');

  if (!modal || !fab) return;

  const toggle = (e) => {
    e?.preventDefault();
    modal.classList.toggle('open');
    modal.setAttribute('aria-hidden', String(!modal.classList.contains('open')));
    if (modal.classList.contains('open')) input?.focus();
  };

  const sendMessage = async () => {
    const text = input?.value.trim();
    if (!text || !body) return;

    appendMsg(body, text, 'user');
    input.value = '';
    body.scrollTop = body.scrollHeight;

    const loadingId = `loading-${Date.now()}`;
    appendMsg(body, 'Piti düşünüyor... 💭', 'bot', loadingId);
    body.scrollTop = body.scrollHeight;

    try {
      const user = Auth.getUser();
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesaj: text, kullanici: user?.ad || 'Misafir' })
      });
      const data = await res.json();
      const loadEl = document.getElementById(loadingId);
      if (loadEl) loadEl.querySelector('p').textContent = data.cevap || 'Bir şeyler ters gitti.';
    } catch {
      const loadEl = document.getElementById(loadingId);
      if (loadEl) loadEl.querySelector('p').innerHTML = '<span style="color:#C0392B">⚠️ Sunucuya ulaşılamıyor.</span>';
    }
    body.scrollTop = body.scrollHeight;
  };

  fab.addEventListener('click', toggle);
  navBtn?.addEventListener('click', toggle);
  closeBtn?.addEventListener('click', toggle);
  sendBtn?.addEventListener('click', sendMessage);
  input?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

  // Klavye ile FAB tetikleme
  fab.addEventListener('keypress', (e) => { if (e.key === 'Enter' || e.key === ' ') toggle(e); });
}

function appendMsg(container, text, type, id = '') {
  const div = document.createElement('div');
  div.className = `chat-msg chat-msg--${type}`;
  if (id) div.id = id;
  div.innerHTML = `<p>${text}</p>`;
  container.appendChild(div);
}