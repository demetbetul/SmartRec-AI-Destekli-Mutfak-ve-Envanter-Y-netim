/**
 * SmartRec — remzi.js  (v7)
 * ✅ initRemzi   — FAB + modal chatbot
 * ✅ initDrawer  — envanter & alışveriş sağ panel
 * ✅ addMissingToShopping — recipes.js tarafından çağrılır
 * ✅ getInventory — remzi.html envanter önerileri için
 * ✅ SKT uyarısı (3 günden az → turuncu, geçmiş → kırmızı)
 */
import { Auth } from './auth.js';

const LS_INV  = 'smartrec_inventory';
const LS_SHOP = 'smartrec_shopping';

// ─── Chatbot ──────────────────────────────────────────────────────────────────
export function initRemzi() {
  const modal    = document.getElementById('chatbotModal');
  const fab      = document.getElementById('chatbotFab');
  const closeBtn = document.getElementById('chatbotClose');
  const input    = document.getElementById('chatbotInput');
  const sendBtn  = document.getElementById('chatbotSend');
  const body     = document.getElementById('chatbotBody');

  if (!modal || !fab) return;

  const openModal  = () => { modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); input?.focus(); };
  const closeModal = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); };
  const isOpen     = () => modal.classList.contains('open');

  fab.addEventListener('click',    () => isOpen() ? closeModal() : openModal());
  fab.addEventListener('keypress', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen() ? closeModal() : openModal(); } });
  closeBtn?.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) closeModal(); });

  // Nav AI Asistanı linki (index.html'de — kendi sayfasında değil)
  if (!window.location.pathname.endsWith('remzi.html')) {
    document.getElementById('navRemzi')?.addEventListener('click', e => {
      if (!Auth.isLoggedIn()) return; // auth-only zaten gizli
      e.preventDefault();
      openModal();
    });
  }

  const sendMsg = async () => {
    const text = input?.value.trim();
    if (!text || !body) return;
    _appendMsg(body, text, 'user');
    input.value = '';
    body.scrollTop = body.scrollHeight;
    let fabChatContext = "Senin adın Remzi, SmartRec'in samimi ve enerjik mutfak asistanısın. \n\nÇOK ÖNEMLİ KURAL: Eğer kullanıcı sadece 'Selam', 'Merhaba' gibi sohbet başlatıcı şeyler yazdıysa KESİNLİKLE hemen yemek tarifi verme! Sadece sıcak bir şekilde selamını al. SADECE kullanıcı açıkça yemek önerisi istediğinde veya 'Ne pişireyim?' dediğinde tarif sun. \n\nAşağıdaki sohbet geçmişine bakarak doğal bir sohbet sürdür:\n\n";

    const loadId = `load-${Date.now()}`;
    _appendMsg(body, 'Remzi düşünüyor... 💭', 'bot', loadId);
    body.scrollTop = body.scrollHeight;
    fabChatContext += "Kullanıcı: " + text + "\n";

    try {
      const user = Auth.getUser();
      const inv  = getInventory().map(i => i.ad).join(', ');
      const res  = await fetch('http://localhost:5000/api/ai/chat', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ mesaj: text, kullanici: user?.ad || 'Misafir', envanter: inv })
      });
      const data = await res.json();
      const el = document.getElementById(loadId);
      if (el) el.querySelector('p').textContent = data.cevap || 'Bir şeyler ters gitti.';
    } catch {
      const el = document.getElementById(loadId);
      if (el) el.querySelector('p').innerHTML = '<span style="color:#C0392B">⚠️ Sunucuya ulaşılamıyor.</span>';
    }
    body.scrollTop = body.scrollHeight;
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

  const openDrawer  = () => { drawer.classList.add('open'); overlay?.classList.add('open'); drawer.setAttribute('aria-hidden','false'); };
  const closeDrawer = () => { drawer.classList.remove('open'); overlay?.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); };

  // inventoryToggle kaldırıldı — artık dropdown üzerinden açılıyor
  // ama eğer başka bir yerde #inventoryToggle varsa yine de çalışsın
  document.getElementById('inventoryToggle')?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  // Tab geçişi
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
    const items = getInventory();
    items.push({ id: Date.now(), ad: name, miktar: Number(qtyEl?.value) || 1, skt: expiryEl?.value || '' });
    _saveInventory(items);
    _renderInventory();
    _dispatchInventoryChange();
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
// ─── MİGROS BUTONUNU OTOMATİK EKLEME KODU ───
  const clearBtn = document.getElementById('clearCheckedBtn');
  
  // Eğer temizle butonu varsa ve Migros butonu henüz eklenmemişse ekle
  if (clearBtn && !document.getElementById('migrosSiparisBtn')) {
    const migrosBtn = document.createElement('button');
    migrosBtn.id = 'migrosSiparisBtn';
    migrosBtn.className = 'btn';
    migrosBtn.innerHTML = '🛒 Migros Sanal Market\'e Git';
    
    // Butonun şık turuncu tasarımı
    migrosBtn.style.cssText = 'width: 100%; margin-top: 12px; background-color: #FF7F00; color: white; border: none; font-weight: 600; padding: 0.6rem; border-radius: 8px; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px;';
    
    // Tıklanınca Migros'u yeni sekmede aç
    migrosBtn.addEventListener('click', () => {
      window.open('https://www.migros.com.tr', '_blank');
    });

    // Butonu "Temizle" butonunun hemen altına yerleştir
    clearBtn.parentNode.insertBefore(migrosBtn, clearBtn.nextSibling);
  }
  // ────────────────────────────────────────────
// ─── Envanter CRUD ────────────────────────────────────────────────────────────
export function getInventory() {
  try { return JSON.parse(localStorage.getItem(LS_INV) || '[]'); }
  catch { return []; }
}
function _saveInventory(items) { localStorage.setItem(LS_INV, JSON.stringify(items)); }
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
      if (diff < 0)     badge = `<span style="color:#e74c3c;font-size:.72rem;margin-left:.3rem">⚠️ SKT geçmiş</span>`;
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
      _saveInventory(getInventory().filter(i => String(i.id) !== btn.dataset.id));
      _renderInventory();
      _dispatchInventoryChange();
    });
  });
}

// ─── Alışveriş CRUD ───────────────────────────────────────────────────────────
function _getShopping() {
  try { return JSON.parse(localStorage.getItem(LS_SHOP) || '[]'); }
  catch { return []; }
}
function _saveShopping(items) { localStorage.setItem(LS_SHOP, JSON.stringify(items)); }

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

  // ─── %100 GARANTİLİ MİGROS BUTONU EKLEME KODU ───
  const clearBtn = document.getElementById('clearCheckedBtn');
  
  if (clearBtn && !document.getElementById('migrosSiparisBtn')) {
    const migrosBtn = document.createElement('button');
    migrosBtn.id = 'migrosSiparisBtn';
    migrosBtn.className = 'btn';
    migrosBtn.innerHTML = '🛒 Migros Sanal Market\'e Git';
    
    // Buton Tasarımı
    migrosBtn.style.cssText = 'width: 100%; margin-top: 12px; background-color: #FF7F00; color: white; border: none; font-weight: 600; padding: 0.6rem; border-radius: 8px; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(255, 127, 0, 0.25);';
    
    // Tıklayınca Migros'a git
    migrosBtn.addEventListener('click', () => {
      window.open('https://www.migros.com.tr', '_blank');
    });

    // İşaretlileri Temizle butonunun hemen altına yapıştır
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
    alert('Tüm malzemeler envanterinizde mevcut! ✅');
    return;
  }

  const items = _getShopping();
  missing.forEach(m => items.push({ id: Date.now() + Math.random(), ad: m, checked: false }));
  _saveShopping(items);
  _renderShopping();

  // Drawer'ı aç, Alışveriş sekmesine geç
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

  alert(`${missing.length} eksik malzeme alışveriş listesine eklendi! 🛒`);
}