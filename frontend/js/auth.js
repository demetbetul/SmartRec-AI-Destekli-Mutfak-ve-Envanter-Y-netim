/**
 * SmartRec — Auth & Header State Module
 * Tüm sayfalarda import edilen ortak modül.
 * Kullanıcı durumunu yönetir ve header'ı dinamik olarak günceller.
 */

// ─── Kullanıcı Yardımcıları ───────────────────────────────────────────────
export const Auth = {
  /** localStorage'dan kullanıcıyı al */
  getUser() {
    try {
      const raw = localStorage.getItem('smartrec_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /** Kullanıcıyı kaydet (login sonrası) */
  setUser(user) {
    localStorage.setItem('smartrec_user', JSON.stringify(user));
    // Geriye dönük uyumluluk
    localStorage.setItem('userName', user.ad || user.name || '');
  },

  /** Oturumu kapat */
  logout() {
    localStorage.removeItem('smartrec_user');
    localStorage.removeItem('userName');
    updateAuthUI(null);
    window.location.href = 'index.html';
  },

  /** Giriş yapılmış mı? */
  isLoggedIn() {
    return !!this.getUser();
  },

  /** Sadece giriş yapanlara açık sayfayı koru */
  requireAuth() {
    if (!this.isLoggedIn()) {
      sessionStorage.setItem('redirect_after_login', window.location.href);
      showUnauthorizedBanner();
      return false;
    }
    return true;
  }
};

// ─── Header UI Güncelle ───────────────────────────────────────────────────
export function updateAuthUI(user) {
  const guestBtns  = document.getElementById('guestActions');
  const userMenu   = document.getElementById('userMenuWrapper');
  const avatarName = document.getElementById('avatarDisplayName');
  const dropName   = document.getElementById('dropdownUserName');
  const dropEmail  = document.getElementById('dropdownUserEmail');
  const logoutBtns = document.querySelectorAll('.logout-btn');

  if (user) {
    // Giriş yapılmış → misafir butonlarını gizle, kullanıcı menüsünü göster
    guestBtns?.classList.add('hidden');
    userMenu?.classList.remove('hidden');

    const displayName = formatName(user.ad || user.name || 'Kullanıcı');
    const initial = displayName.charAt(0).toUpperCase();

    if (avatarName) avatarName.textContent = initial;
    if (dropName)   dropName.textContent   = displayName;
    if (dropEmail)  dropEmail.textContent  = user.email || '';

    // Dashboard hoş geldin mesajı
    const welcomeEl = document.getElementById('userNameDisplay');
    if (welcomeEl) welcomeEl.textContent = `Hoş geldin, ${displayName}`;

    // Piti karşılama
    const pitiWelcome = document.getElementById('pitiWelcomeMsg');
    if (pitiWelcome) pitiWelcome.innerHTML = `Merhaba <strong>${displayName}</strong>! 👋 Bugün ne pişiriyoruz?`;

  } else {
    // Giriş yapılmamış → misafir butonlarını göster
    guestBtns?.classList.remove('hidden');
    userMenu?.classList.add('hidden');
  }

  // Logout butonlarına event ekle
  logoutBtns.forEach(btn => {
    btn.replaceWith(btn.cloneNode(true)); // Önceki listener'ları temizle
  });
  document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', () => Auth.logout());
  });
}

// ─── Dropdown Toggle ──────────────────────────────────────────────────────
export function initDropdown() {
  const trigger  = document.getElementById('userAvatarBtn');
  const dropdown = document.getElementById('profileDropdown');
  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('active');
    trigger.setAttribute('aria-expanded', dropdown.classList.contains('active'));
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('active');
    trigger?.setAttribute('aria-expanded', 'false');
  });
  dropdown.addEventListener('click', (e) => e.stopPropagation());
}

// ─── Hamburger Menü ───────────────────────────────────────────────────────
export function initHamburger() {
  const btn = document.getElementById('hamburger');
  const nav = document.querySelector('.nav');
  btn?.addEventListener('click', () => {
    nav?.classList.toggle('open');
    btn.classList.toggle('open');
  });
}

// ─── Header Scroll Efekti ─────────────────────────────────────────────────
export function initScrollHeader() {
  const header = document.getElementById('header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ─── Yetkisiz Erişim Banner'ı ─────────────────────────────────────────────
function showUnauthorizedBanner() {
  const existing = document.getElementById('authBanner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'authBanner';
  banner.innerHTML = `
    <div class="auth-banner">
      <div class="auth-banner__inner">
        <span class="auth-banner__icon">🔒</span>
        <div>
          <strong>Bu sayfaya erişmek için giriş yapmanız gerekiyor.</strong>
          <p>Hesabınız yoksa hemen ücretsiz kayıt olabilirsiniz.</p>
        </div>
        <div class="auth-banner__actions">
          <a href="login.html" class="btn btn--primary btn--sm">Giriş Yap</a>
          <a href="register.html" class="btn btn--outline btn--sm">Kayıt Ol</a>
        </div>
      </div>
    </div>
  `;

  // Dashboard içeriğini bulanıklaştır
  const main = document.querySelector('main');
  if (main) {
    main.style.filter = 'blur(4px)';
    main.style.pointerEvents = 'none';
    main.style.userSelect = 'none';
  }

  document.body.insertAdjacentElement('afterbegin', banner);

  // 4 saniye sonra login'e yönlendir
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 4000);
}

// ─── Yardımcı Fonksiyonlar ───────────────────────────────────────────────
function formatName(name) {
  return name.trim().split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ─── Global Init ─────────────────────────────────────────────────────────
export function initPage() {
  initScrollHeader();
  initHamburger();
  initDropdown();
  updateAuthUI(Auth.getUser());
}