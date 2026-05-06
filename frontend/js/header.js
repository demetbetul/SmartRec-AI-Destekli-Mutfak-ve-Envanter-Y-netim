/**
 * SmartRec — Ortak Header Şablonu
 * Her sayfada <div id="app-header"></div> içine inject edilir.
 */

export function renderHeader(activePage = 'home') {
  const links = [
    { href: 'index.html', label: 'Anasayfa', key: 'home' },
    { href: 'menu.html',  label: 'Menüler',  key: 'menu' },
    { href: '#',          label: 'AI Asistanı', key: 'ai', id: 'openPiti' },
    { href: '#',          label: 'İletişim',   key: 'contact' },
  ];

  const navLinks = links.map(l => `
    <a href="${l.href}"
       class="nav__link${activePage === l.key ? ' nav__link--active' : ''}"
       ${l.id ? `id="${l.id}"` : ''}>
      ${l.label}
    </a>
  `).join('');

  return `
    <header class="header" id="header">
      <div class="header__inner">

        <a href="index.html" class="logo">
          <span class="logo__icon">🍽</span>
          <span class="logo__text">SmartRec</span>
        </a>

        <nav class="nav" id="mainNav">
          ${navLinks}
        </nav>

        <div class="header__actions">

          <!-- MİSAFİR: Giriş Yap + Kayıt Ol (giriş yapmamışsa görünür) -->
          <div id="guestActions" class="guest-actions">
            <a href="login.html" class="btn btn--outline btn--sm">Giriş Yap</a>
            <a href="register.html" class="btn btn--primary btn--sm">Kayıt Ol</a>
          </div>

          <!-- KULLANICI: Avatar + Dropdown (giriş yapılmışsa görünür) -->
          <div id="userMenuWrapper" class="user-profile-wrapper hidden">
            <button class="user-avatar-btn" id="userAvatarBtn" aria-haspopup="true" aria-expanded="false">
              <span class="user-avatar" id="avatarDisplayName">?</span>
            </button>

            <div class="profile-dropdown" id="profileDropdown" role="menu">
              <div class="dropdown-header">
                <p class="user-name" id="dropdownUserName">Kullanıcı</p>
                <p class="user-email" id="dropdownUserEmail">kullanici@smartrec.app</p>
              </div>
              <hr class="dropdown-divider">
              <ul class="dropdown-links">
                <li><a href="#"><span>👤</span> Profilim</a></li>
                <li><a href="dashboard.html"><span>📊</span> Panelim</a></li>
                <li><a href="#"><span>⭐</span> Favori Tariflerim</a></li>
                <li><a href="#"><span>⚙️</span> Ayarlar</a></li>
              </ul>
              <hr class="dropdown-divider">
              <button class="logout-btn" id="logoutBtn">🚪 Çıkış Yap</button>
            </div>
          </div>

          <button class="hamburger" id="hamburger" aria-label="Menüyü Aç/Kapat">
            <span></span><span></span><span></span>
          </button>

        </div>
      </div>
    </header>
  `;
}

/** Chatbot FAB + Modal HTML */
export function renderChatbot() {
  return `
    <div class="chatbot-fab" id="chatbotFab" title="Piti AI Asistanı" role="button" tabindex="0">
      <span class="chatbot-fab__icon">🤖</span>
      <span class="chatbot-fab__dot"></span>
    </div>

    <div class="chatbot-modal" id="chatbotModal" aria-hidden="true" role="dialog" aria-label="Piti AI Asistanı">
      <div class="chatbot-modal__header">
        <div class="chatbot-modal__title">
          <span aria-hidden="true">✦</span> Piti — AI Asistanı
        </div>
        <button class="chatbot-modal__close" id="chatbotClose" aria-label="Kapat">✕</button>
      </div>
      <div class="chatbot-modal__body" id="chatbotBody">
        <div class="chat-msg chat-msg--bot">
          <p id="pitiWelcomeMsg">Merhaba! Ben Piti 👋 Bugün ne pişirmek istersiniz? Malzemelerinizi yazın, size özel tarif önereyim!</p>
        </div>
      </div>
      <div class="chatbot-modal__footer">
        <input type="text" class="chatbot-input" id="chatbotInput" placeholder="Bir şeyler yazın..." autocomplete="off" />
        <button class="btn btn--primary chatbot-send" id="chatbotSend" aria-label="Gönder">→</button>
      </div>
    </div>
  `;
}