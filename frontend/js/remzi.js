
import { Auth } from './auth.js';

function _userSuffix() {
  const user = Auth.getUser();
  if (!user?.email) return '';
  return '_' + user.email.replace('@', '_at_').replace(/\./g, '_');
}

function _invKey()  { return `smartrec_inventory${_userSuffix()}`; }
function _shopKey() { return `smartrec_shopping${_userSuffix()}`; }

// ─── Toast yardımcısı ─────────────────────────────────────────────────────────
function _srToast({ type = 'info', icon = 'ℹ️', title = '', sub = '' } = {}) {
  if (typeof window.srToast === 'function') {
    window.srToast({ type, icon, title, sub });
    return;
  }
  const container = document.getElementById('sr-toast-container') || (() => {
    const el = document.createElement('div');
    el.id = 'sr-toast-container';
    el.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:99999;display:flex;flex-direction:column;gap:0.5rem;';
    document.body.appendChild(el);
    return el;
  })();
  const toast = document.createElement('div');
  toast.style.cssText = `
    display:flex;align-items:center;gap:0.75rem;
    background:#1A1208;color:#fff;
    padding:0.85rem 1.25rem;border-radius:14px;
    font-size:0.875rem;font-weight:500;
    box-shadow:0 4px 20px rgba(0,0,0,0.25);
    animation:toastIn 0.3s ease both;
    max-width:320px;
  `;
  toast.innerHTML = `<span style="font-size:1.1rem">${icon}</span><div><div style="font-weight:700">${title}</div>${sub ? `<div style="opacity:0.75;font-size:0.78rem;margin-top:2px">${sub}</div>` : ''}</div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.25s ease forwards';
    setTimeout(() => toast.remove(), 280);
  }, 3800);
}

// ─── Chatbot ──────────────────────────────────────────────────────────────────
export function initRemzi() {
  const modal    = document.getElementById('chatbotModal');
  const fab      = document.getElementById('chatbotFab');
  const closeBtn = document.getElementById('chatbotClose');
  const input    = document.getElementById('chatbotInput');
  const sendBtn  = document.getElementById('chatbotSend');
  const body     = document.getElementById('chatbotBody');

  if (!modal || !fab) return;

  const openModal  = () => { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); input?.focus(); };
  const closeModal = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); };
  const isOpen     = () => modal.classList.contains('open');

  fab.addEventListener('click',    () => isOpen() ? closeModal() : openModal());
  fab.addEventListener('keypress', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen() ? closeModal() : openModal(); } });
  closeBtn?.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) closeModal(); });

  if (!window.location.pathname.endsWith('remzi.html')) {
    document.getElementById('navRemzi')?.addEventListener('click', e => {
      if (!Auth.isLoggedIn()) return;
      e.preventDefault();
      openModal();
    });
  }

  let isWaitingForResponse = false; // 1. İstek kilidi eklendi

  const sendMsg = async () => {
    // Eğer Remzi hala düşünüyorsa yeni mesaja izin verme
    if (isWaitingForResponse) return; 

    const text = input?.value.trim();
    if (!text || !body) return;

    // İstek başladı, kilidi kapat ve butonu devre dışı bırak
    isWaitingForResponse = true;
    if (sendBtn) sendBtn.disabled = true;

    _appendMsg(body, text, 'user');
    input.value = '';
    body.scrollTop = body.scrollHeight;

    const loadId = `load-${Date.now()}`;
    _appendMsg(body, 'Remzi düşünüyor... 💭', 'bot', loadId);
    body.scrollTop = body.scrollHeight;

    try {
      const user = Auth.getUser();

      const res  = await fetch('http://localhost:5000/api/ai/chat', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          // Ön yüzden envanter göndermeyi kaldırdık, çünkü backend (Python) zaten ekliyor.
          mesaj    : text, 
          kullanici: user?.ad || 'Misafir',
          email    : user?.email || ''
        })
      });
    
      const data = await res.json();
      const el = document.getElementById(loadId);
      // Remzi'nin satır atlamalarını düzgün göstermek için ufak bir regex eklendi
      if (el) el.querySelector('p').innerHTML = data.cevap.replace(/\n/g, '<br>') || 'Bir şeyler ters gitti.';
    } catch {
      const el = document.getElementById(loadId);
      if (el) el.querySelector('p').innerHTML = '<span style="color:#C0392B">⚠️ Sunucuya ulaşılamıyor.</span>';
    } finally {
      // İstek bitti, kilidi aç, butonu aktifleştir ve odağı inputa geri ver
      isWaitingForResponse = false;
      if (sendBtn) sendBtn.disabled = false;
      body.scrollTop = body.scrollHeight;
      input?.focus(); 
    }
  };

  sendBtn?.addEventListener('click', sendMsg);
  input?.addEventListener('keypress', e => { if (e.key === 'Enter') sendMsg(); });
}

function _appendMsg(container, text, type, id = '') {
  const div = document.createElement('div');
  div.className = `chat-msg chat-msg--${type}`;
  if (id) div.id = id;
  div.innerHTML = `<p>${text}</p>`;
  container.appendChild(div);
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
export function initDrawer() {
  const drawer   = document.getElementById('inventoryDrawer');
  const overlay  = document.getElementById('drawerOverlay');
  const closeBtn = document.getElementById('drawerClose');

  if (!drawer) return;

  const openDrawer  = () => { drawer.classList.add('open'); overlay?.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); };
  const closeDrawer = () => { drawer.classList.remove('open'); overlay?.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); };

  document.getElementById('inventoryToggle')?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  drawer.querySelectorAll('.drawer__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      drawer.querySelectorAll('.drawer__tab').forEach(t => t.classList.remove('drawer__tab--active'));
      tab.classList.add('drawer__tab--active');
      const target = tab.dataset.tab;
      document.getElementById('tabInventory')?.classList.toggle('hidden', target !== 'inventory');
      document.getElementById('tabShopping')?.classList.toggle('hidden',  target !== 'shopping');
    });
  });

  _renderInventory();
  _renderShopping();

  // Envanter: ekle
  document.getElementById('addInventoryBtn')?.addEventListener('click', () => {
    const nameEl   = document.getElementById('invItemName');
    const qtyEl    = document.getElementById('invItemQty');
    const expiryEl = document.getElementById('invItemExpiry');
    const name = nameEl?.value.trim();
    if (!name) { nameEl?.focus(); return; }

    const user = Auth.getUser();
    const newItem = { id: Date.now(), ad: name, miktar: Number(qtyEl?.value) || 1, skt: expiryEl?.value || '' };

    const items = getInventory();
    items.push(newItem);
    _saveInventory(items);
    _renderInventory();
    _dispatchInventoryChange();

    // Sonra backend'e de gönder (oturum açıksa)
    if (user?.email) {
      fetch('http://localhost:5000/api/inventory/add', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          email          : user.email,
          ad             : name,
          miktar         : Number(qtyEl?.value) || 1,
          tuketim_suresi : expiryEl?.value ? null : 7  // SKT seçildiyse backend hesaplar
        })
      }).catch(() => {}); // backend kapalıysa sessiz kal
    }

    if (nameEl)   nameEl.value   = '';
    if (qtyEl)    qtyEl.value    = '';
    if (expiryEl) expiryEl.value = '';
    nameEl?.focus();
  });

  // Alışveriş: ekle
  document.getElementById('addShopBtn')?.addEventListener('click', _addShopItem);
  document.getElementById('shopItemName')?.addEventListener('keypress', e => { if (e.key === 'Enter') _addShopItem(); });

  // İşaretlenenleri temizle
  document.getElementById('clearCheckedBtn')?.addEventListener('click', () => {
    _saveShopping(_getShopping().filter(i => !i.checked));
    _renderShopping();
  });
}

// ─── Envanter CRUD ────────────────────────────────────────────────────────────
export function getInventory() {
  try { return JSON.parse(localStorage.getItem(_invKey()) || '[]'); }
  catch { return []; }
}

function _saveInventory(items) {
  localStorage.setItem(_invKey(), JSON.stringify(items));
}

function _dispatchInventoryChange() {
  window.dispatchEvent(new CustomEvent('smartrec:inventory-change'));
}

function _renderInventory() {
  const list = document.getElementById('inventoryList');
  if (!list) return;
  const items = getInventory();

  if (!items.length) {
    list.innerHTML = '<li class="drawer__empty">Henüz malzeme eklenmedi.</li>';
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  list.innerHTML = items.map(item => {
    let badge = '';
    if (item.skt) {
      const diff = Math.ceil((new Date(item.skt) - new Date(today)) / 86400000);
      if (diff < 0)       badge = `<span style="color:#e74c3c;font-size:.72rem;margin-left:.3rem">⚠️ SKT geçmiş</span>`;
      else if (diff <= 3) badge = `<span style="color:#e67e22;font-size:.72rem;margin-left:.3rem">⏳ ${diff}g kaldı</span>`;
    }
    return `
<li class="drawer__item" data-id="${item.id}">
  <span class="drawer__item-name">${item.ad}${badge}</span>
  <span class="drawer__item-meta">${item.miktar} adet${item.skt ? ' · ' + item.skt : ''}</span>
  <button class="drawer__item-del" data-id="${item.id}" aria-label="Sil">✕</button>
</li>`;
  }).join('');

  list.querySelectorAll('.drawer__item-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const all     = getInventory();
      const item    = all.find(i => String(i.id) === btn.dataset.id); // sil öncesi bul
      const updated = all.filter(i => String(i.id) !== btn.dataset.id);
      _saveInventory(updated);
      _renderInventory();
      _dispatchInventoryChange();

      // Backend'den de sil
      const user = Auth.getUser();
      if (user?.email && item) {
        fetch(`http://localhost:5000/api/inventory/remove/${encodeURIComponent(item.ad)}?email=${encodeURIComponent(user.email)}`, {
          method: 'DELETE'
        }).catch(() => {});
      }
    });
  });
}

// ─── Alışveriş CRUD ───────────────────────────────────────────────────────────
function _getShopping() {
  try { return JSON.parse(localStorage.getItem(_shopKey()) || '[]'); }
  catch { return []; }
}

function _saveShopping(items) {
  localStorage.setItem(_shopKey(), JSON.stringify(items));
}

function _addShopItem() {
  const input = document.getElementById('shopItemName');
  const name  = input?.value.trim();
  if (!name) return;
  const items = _getShopping();
  items.push({ id: Date.now(), ad: name, checked: false });
  _saveShopping(items);
  _renderShopping();
  if (input) input.value = '';
}

function _renderShopping() {
  const list = document.getElementById('shoppingList');
  if (!list) return;
  const items = _getShopping();

  if (!items.length) {
    list.innerHTML = '<li class="drawer__empty">Liste boş.</li>';
  } else {
    list.innerHTML = items.map(item => `
<li class="drawer__item drawer__item--shop${item.checked ? ' checked' : ''}" data-id="${item.id}">
  <input type="checkbox" class="shop-check" data-id="${item.id}" ${item.checked ? 'checked' : ''} />
  <span class="drawer__item-name">${item.ad}</span>
  <button class="drawer__item-del" data-id="${item.id}" aria-label="Sil">✕</button>
</li>`).join('');

    list.querySelectorAll('.shop-check').forEach(cb => {
      cb.addEventListener('change', () => {
        const all  = _getShopping();
        const item = all.find(i => String(i.id) === cb.dataset.id);
        if (item) item.checked = cb.checked;
        _saveShopping(all);
        _renderShopping();
      });
    });

    list.querySelectorAll('.drawer__item-del').forEach(btn => {
      btn.addEventListener('click', () => {
        _saveShopping(_getShopping().filter(i => String(i.id) !== btn.dataset.id));
        _renderShopping();
      });
    });
  }

  // Migros butonu (tekrar eklenmeyi önle)
  const clearBtn = document.getElementById('clearCheckedBtn');
  if (clearBtn && !document.getElementById('migrosSiparisBtn')) {
    const migrosBtn = document.createElement('button');
    migrosBtn.id = 'migrosSiparisBtn';
    migrosBtn.className = 'btn';
    migrosBtn.innerHTML = '🛒 Migros Sanal Market\'e Git';
    migrosBtn.style.cssText = 'width:100%;margin-top:12px;background-color:#FF7F00;color:white;border:none;font-weight:600;padding:0.6rem;border-radius:8px;cursor:pointer;display:flex;justify-content:center;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(255,127,0,0.25);';
    migrosBtn.addEventListener('click', () => window.open('https://www.migros.com.tr', '_blank'));
    clearBtn.parentNode.insertBefore(migrosBtn, clearBtn.nextSibling);
  }
}

// ─── Eksikleri Alışveriş'e Ekle ──────────────────────────────────────────────
export function addMissingToShopping(recipeMaterials) {
  const inv     = getInventory().map(i => i.ad.toLowerCase());
  const shop    = _getShopping().map(i => i.ad.toLowerCase());
  const missing = recipeMaterials.filter(
    m => !inv.includes(m.toLowerCase()) && !shop.includes(m.toLowerCase())
  );

  if (!missing.length) {
    _srToast({ type: 'success', icon: '✅', title: 'Tüm malzemeler mevcut!', sub: 'Envanterinizde eksiksiz hazır.' });
    return;
  }

  const items = _getShopping();
  missing.forEach(m => items.push({ id: Date.now() + Math.random(), ad: m, checked: false }));
  _saveShopping(items);
  _renderShopping();

  const drawer  = document.getElementById('inventoryDrawer');
  const overlay = document.getElementById('drawerOverlay');
  if (drawer) {
    drawer.classList.add('open');
    overlay?.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.querySelectorAll('.drawer__tab').forEach(t =>
      t.classList.toggle('drawer__tab--active', t.dataset.tab === 'shopping')
    );
    document.getElementById('tabInventory')?.classList.add('hidden');
    document.getElementById('tabShopping')?.classList.remove('hidden');
  }

  _srToast({
    type: 'info', icon: '🛒',
    title: 'Malzemeler Listeye Eklendi',
    sub: `${missing.length} eksik malzeme alışveriş listesine eklendi.`
  });
}