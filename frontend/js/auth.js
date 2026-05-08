/**
 * SmartRec — auth.js  (v7 — Tam & Düzeltilmiş)
 *
 * DÜZELTMELER:
 *  ✅ Auth.setUser() alias eklendi (login.html bunu çağırıyor)
 *  ✅ Dropdown: CSS'deki .active class'ı kullanılıyor (.open değil)
 *  ✅ initPage() header DOM'u oluştuktan sonra event bind ediyor
 *  ✅ Hamburger mobil menüsü tam çalışır
 *  ✅ Scroll → header gölge efekti
 *  ✅ Misafir/üye görünümü koşullu yönetimi
 *  ✅ auth-only nav linkleri JS ile gösterilir
 */

const LS_USER = 'smartrec_user';

// ─── Auth API ────────────────────────────────────────────────────────────────
export const Auth = {
  getUser() {
    try { return JSON.parse(localStorage.getItem(LS_USER) || 'null'); }
    catch { return null; }
  },

  isLoggedIn() { return !!this.getUser(); },

  /** Giriş yaptır (kullanıcıyı kaydet) */
  login(userData) {
    localStorage.setItem(LS_USER, JSON.stringify(userData));
    window.dispatchEvent(new CustomEvent('smartrec:auth-change', { detail: { user: userData } }));
  },

  /** login() ile aynı — login.html eski adı kullanıyor */
  setUser(userData) { this.login(userData); },

  /** Oturumu kapat */
  logout() {
    localStorage.removeItem(LS_USER);
    window.dispatchEvent(new CustomEvent('smartrec:auth-change', { detail: { user: null } }));
    window.location.href = 'index.html';
  },

  /** Giriş zorunlu sayfalar için yönlendirme */
  requireAuth(returnTo) {
    if (!this.isLoggedIn()) {
      const page = returnTo || window.location.pathname.split('/').pop() || 'index.html';
      sessionStorage.setItem('redirect_after_login', page);
      window.location.href = 'login.html';
    }
  }
};

// ─── initPage ────────────────────────────────────────────────────────────────
/**
 * Her sayfada, header inject edildikten SONRA çağrılır.
 * Header DOM hazır olduğunda tüm event'leri bağlar ve UI'yı günceller.
 */
export function initPage() {
  _applyAuthUI();
  window.addEventListener('smartrec:auth-change', () => _applyAuthUI());
}

// ─── İç Yardımcılar ──────────────────────────────────────────────────────────
function _applyAuthUI() {
  const user       = Auth.getUser();
  const isLoggedIn = !!user;

  // Misafir / Üye alanlarını göster-gizle
  const authLinks = document.querySelectorAll('.nav__link--auth-only');
  const guestActions = document.getElementById('guestActions');
  const userWrapper  = document.getElementById('userMenuWrapper');
  guestActions?.classList.toggle('hidden', isLoggedIn);
  userWrapper?.classList.toggle('hidden', !isLoggedIn);
  
  // Auth-only nav linkleri
  document.querySelectorAll('.nav__link--auth-only').forEach(link => {
    link.style.display = isLoggedIn ? '' : 'none';
  });

  if (isLoggedIn && user) {
    const firstName = (user.ad || user.name || 'U').trim().split(' ')[0];
    const initial   = firstName.charAt(0).toUpperCase();
  
  if (authLinks.length > 0) {
    authLinks.forEach(link => {
      link.style.display = isLoggedIn ? 'inline-block' : 'none';
    });
  }
  
    const avatarEl = document.getElementById('avatarDisplayName');
    const nameEl   = document.getElementById('dropdownUserName');
    const emailEl  = document.getElementById('dropdownUserEmail');

    if (avatarEl) avatarEl.textContent = initial;
    if (nameEl)   nameEl.textContent   = user.ad || user.name || 'Kullanıcı';
    if (emailEl)  emailEl.textContent  = user.email || '';

    // remzi.html welcome mesajı
    const welcomeEl = document.getElementById('remziWelcomeMsg');
    if (welcomeEl && !welcomeEl.dataset.personalized) {
      welcomeEl.innerHTML   = `Merhaba <strong>${firstName}</strong>! 👋 Bugün ne pişirmek istersiniz?`;
      welcomeEl.dataset.personalized = 'true';
    }
  }

  _bindHeaderEvents();
}

let _bound = false;
function _bindHeaderEvents() {
  if (_bound) return;

  // Avatar → dropdown aç/kapat  (CSS: .active class)
  const avatarBtn = document.getElementById('userAvatarBtn');
  const dropdown  = document.getElementById('profileDropdown');

  if (avatarBtn && dropdown) {
    _bound = true; // Sadece ikisi de varsa bağla

    avatarBtn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle('active');
      avatarBtn.setAttribute('aria-expanded', String(isOpen));
    });

    // Dışarı tıklayınca kapat
    document.addEventListener('click', e => {
      if (!dropdown.contains(e.target) && e.target !== avatarBtn) {
        dropdown.classList.remove('active');
        avatarBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // ESC ile kapat
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        dropdown.classList.remove('active');
        avatarBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.logout());

  // Hamburger (mobil)
  const hamburger = document.getElementById('hamburger');
  const mainNav   = document.getElementById('mainNav');
  hamburger?.addEventListener('click', () => {
    mainNav?.classList.toggle('open');
    hamburger.classList.toggle('open');
    const expanded = hamburger.classList.contains('open');
    hamburger.setAttribute('aria-expanded', String(expanded));
  });

  // Mobil: nav link'e tıklayınca menüyü kapat
  document.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      mainNav?.classList.remove('open');
      hamburger?.classList.remove('open');
    });
  });

  // Scroll → header gölge
  const header = document.getElementById('header');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // ilk çalıştırma
  }

  // Profil dropdown'ındaki envanter/alışveriş butonları
  document.getElementById('dropdownInventoryBtn')?.addEventListener('click', e => {
    e.preventDefault();
    dropdown?.classList.remove('active');
    _openDrawer('inventory');
  });
  document.getElementById('dropdownShoppingBtn')?.addEventListener('click', e => {
    e.preventDefault();
    dropdown?.classList.remove('active');
    _openDrawer('shopping');
  });

  // Profil Ayarları Modal
  document.getElementById('profileSettingsBtn')?.addEventListener('click', e => {
    e.preventDefault();
    dropdown?.classList.remove('active');
    _openProfileSettings();
  });
  document.getElementById('closeProfileSettings')?.addEventListener('click', () => {
    document.getElementById('profileSettingsModal').style.display = 'none';
  });
  document.getElementById('profileSettingsModal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });
  document.getElementById('saveProfileSettings')?.addEventListener('click', () => {
    const user = Auth.getUser();
    if (!user) return;
    const name = document.getElementById('settingsName')?.value.trim();
    const email = document.getElementById('settingsEmail')?.value.trim();
    const goal = document.getElementById('settingsCalGoal')?.value;
    if (name) user.ad = name;
    if (email) user.email = email;
    if (goal) user.calorieGoal = Number(goal);
    Auth.login(user);
    document.getElementById('profileSettingsModal').style.display = 'none';
    // Kullanıcı adını güncelle
    const avatarEl = document.getElementById('avatarDisplayName');
    const nameEl   = document.getElementById('dropdownUserName');
    const emailEl  = document.getElementById('dropdownUserEmail');
    if (avatarEl) avatarEl.textContent = (user.ad||'U').charAt(0).toUpperCase();
    if (nameEl)   nameEl.textContent   = user.ad || 'Kullanıcı';
    if (emailEl)  emailEl.textContent  = user.email || '';
  });
}

function _openDrawer(tab) {
  const drawer  = document.getElementById('inventoryDrawer');
  const overlay = document.getElementById('drawerOverlay');
  if (!drawer) return;
  drawer.classList.add('open');
  overlay?.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  if (tab) {
    drawer.querySelectorAll('.drawer__tab').forEach(t => {
      t.classList.toggle('drawer__tab--active', t.dataset.tab === tab);
    });
    document.getElementById('tabInventory')?.classList.toggle('hidden', tab !== 'inventory');
    document.getElementById('tabShopping')?.classList.toggle('hidden',  tab !== 'shopping');
  }
}
function _openProfileSettings() {
  const modal = document.getElementById('profileSettingsModal');
  if (!modal) return;
  const user = Auth.getUser();
  if (user) {
    const nameEl = document.getElementById('settingsName');
    const emailEl = document.getElementById('settingsEmail');
    const goalEl = document.getElementById('settingsCalGoal');
    if (nameEl) nameEl.value = user.ad || user.name || '';
    if (emailEl) emailEl.value = user.email || '';
    if (goalEl) goalEl.value = user.calorieGoal || 2000;
  }
  modal.style.display = 'flex';
}