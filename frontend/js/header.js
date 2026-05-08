/**
 * SmartRec — header.js  (v8)
 * ✅ Favori Tariflerim dropdown'a eklendi
 * ✅ Profil Ayarlarım butonu çalışır hale getirildi
 */

export function renderHeader(activePage = 'home') {
  const a = (page, href, label, authOnly = false) => {
    const active = activePage === page ? ' nav__link--active' : '';
    const cls    = authOnly ? `nav__link nav__link--auth-only${active}` : `nav__link${active}`;
    const style  = authOnly ? ' style="display:none"' : '';
    return `<a href="${href}" class="${cls}"${style}>${label}</a>`;
  };

  return `
<header class="header" id="header">
  <div class="header__inner">

    <a href="index.html" class="logo">
      <span class="logo__icon">🍽</span>
      <span class="logo__text">SmartRec</span>
    </a>

    <nav class="nav" id="mainNav">
      ${a('home',     'index.html',    'Anasayfa')}
      ${a('recipes',  'recipes.html',  'Tarifler')}
      ${a('remzi',    'remzi.html',    'AI Asistanı',   true)}
      ${a('calories', 'calories.html', 'Kalori Takibi', true)}
    </nav>

    <div class="header__actions">

      <div id="guestActions" class="guest-actions">
        <a href="login.html"              class="btn btn--outline btn--sm">Giriş Yap</a>
        <a href="login.html?tab=register" class="btn btn--primary btn--sm">Kayıt Ol</a>
      </div>

      <div id="userMenuWrapper" class="user-profile-wrapper hidden">
        <button class="user-avatar-btn" id="userAvatarBtn" aria-haspopup="true" aria-expanded="false">
          <span class="user-avatar" id="avatarDisplayName">?</span>
        </button>

        <div class="profile-dropdown" id="profileDropdown" role="menu">
          <div class="dropdown-header">
            <p class="user-name"  id="dropdownUserName">Kullanıcı</p>
            <p class="user-email" id="dropdownUserEmail">kullanici@smartrec.app</p>
          </div>
          <hr class="dropdown-divider" />
          <ul class="dropdown-links">
            <li><a href="favorites.html" id="dropdownFavoritesBtn"><span>❤️</span> Favori Tariflerim</a></li>
            <li><a href="#" id="dropdownInventoryBtn"><span>🧊</span> Envanterim</a></li>
            <li><a href="#" id="dropdownShoppingBtn"><span>🛒</span> Alışveriş Listem</a></li>
            <li><a href="dashboard.html"><span>📊</span> Panelim</a></li>
            <li><a href="#" id="profileSettingsBtn"><span>⚙️</span> Profil Ayarlarım</a></li>
          </ul>
          <hr class="dropdown-divider" />
          <button class="logout-btn" id="logoutBtn">🚪 Çıkış Yap</button>
        </div>
      </div>

      <button class="hamburger" id="hamburger" aria-label="Menüyü Aç/Kapat">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>`;
}

export function renderChatbot() {
  return `
<!-- Floating Action Button -->
<div class="chatbot-fab" id="chatbotFab"
     title="Remzi AI Asistanı" role="button" tabindex="0"
     aria-label="Remzi AI Asistanı'nı Aç">
  <span class="chatbot-fab__icon">🤖</span>
  <span class="chatbot-fab__dot"></span>
</div>

<!-- Chatbot Modal -->
<div class="chatbot-modal" id="chatbotModal"
     aria-hidden="true" role="dialog" aria-label="Remzi AI Asistanı">
  <div class="chatbot-modal__header">
    <div class="chatbot-modal__title">
      <span>✦</span> Remzi — AI Asistanı
    </div>
    <button class="chatbot-modal__close" id="chatbotClose" aria-label="Kapat">✕</button>
  </div>
  <div class="chatbot-modal__body" id="chatbotBody">
    <div class="chat-msg chat-msg--bot">
      <p id="remziWelcomeMsg">Merhaba! Ben Remzi 👋 Bugün ne pişirmek istersiniz?</p>
    </div>
  </div>
  <div class="chatbot-modal__footer">
    <input type="text" class="chatbot-input" id="chatbotInput"
           placeholder="Bir şeyler yazın..." autocomplete="off" />
    <button class="btn btn--primary chatbot-send" id="chatbotSend" aria-label="Gönder">→</button>
  </div>
</div>

<!-- Envanter & Alışveriş Drawer -->
<div class="inventory-drawer" id="inventoryDrawer" aria-hidden="true">
  <div class="drawer__header">
    <h3>🧊 Mutfağım</h3>
    <button class="drawer__close" id="drawerClose" aria-label="Kapat">✕</button>
  </div>
  <div class="drawer__tabs">
    <button class="drawer__tab drawer__tab--active" data-tab="inventory">🧊 Envanter</button>
    <button class="drawer__tab" data-tab="shopping">🛒 Alışveriş</button>
  </div>

  <!-- Envanter Paneli -->
  <div class="drawer__panel" id="tabInventory">
    <div class="drawer__add-row">
      <input type="text"   id="invItemName"   placeholder="Malzeme adı"  class="drawer-input" />
      <input type="number" id="invItemQty"    placeholder="Adet"         class="drawer-input drawer-input--sm" min="1" />
      <input type="date"   id="invItemExpiry"                             class="drawer-input" />
      <button class="btn btn--primary btn--sm" id="addInventoryBtn">Ekle</button>
    </div>
    <ul class="drawer__list" id="inventoryList">
      <li class="drawer__empty">Henüz malzeme eklenmedi.</li>
    </ul>
  </div>

  <!-- Alışveriş Paneli -->
  <div class="drawer__panel hidden" id="tabShopping">
    <div class="drawer__add-row">
      <input type="text" id="shopItemName" placeholder="Ürün ekle..." class="drawer-input" />
      <button class="btn btn--primary btn--sm" id="addShopBtn">Ekle</button>
    </div>
    <ul class="drawer__list" id="shoppingList">
      <li class="drawer__empty">Liste boş.</li>
    </ul>
    <div class="drawer__footer-actions">
      <button class="btn btn--ghost btn--sm" id="clearCheckedBtn">✓ İşaretlileri Temizle</button>
    </div>
  </div>
</div>

<!-- Profil Ayarları Modal -->
<div id="profileSettingsModal" style="display:none; position:fixed; inset:0; z-index:9500; background:rgba(0,0,0,0.4); align-items:center; justify-content:center;">
  <div style="background:#fff; border-radius:1.5rem; padding:2rem; width:min(420px, 90vw); box-shadow:0 8px 40px rgba(0,0,0,0.18); animation:fadeInUp 0.3s ease both;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
      <h2 style="font-family:var(--font-display); font-size:1.4rem;">⚙️ Profil Ayarları</h2>
      <button id="closeProfileSettings" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:#888;">✕</button>
    </div>
    <div style="display:flex; flex-direction:column; gap:1rem;">
      <div>
        <label style="font-size:0.85rem;font-weight:600;color:#1A1208;display:block;margin-bottom:0.35rem;">Ad Soyad</label>
        <input type="text" id="settingsName" class="input" placeholder="Adınız" />
      </div>
      <div>
        <label style="font-size:0.85rem;font-weight:600;color:#1A1208;display:block;margin-bottom:0.35rem;">E-posta</label>
        <input type="email" id="settingsEmail" class="input" placeholder="E-postanız" />
      </div>
      <div>
        <label style="font-size:0.85rem;font-weight:600;color:#1A1208;display:block;margin-bottom:0.35rem;">Günlük Kalori Hedefi (kcal)</label>
        <input type="number" id="settingsCalGoal" class="input" placeholder="2000" min="500" max="5000" />
      </div>
      <button id="saveProfileSettings" class="btn btn--primary" style="width:100%;margin-top:0.5rem;">💾 Kaydet</button>
    </div>
  </div>
</div>

<!-- Drawer overlay -->
<div class="drawer-overlay" id="drawerOverlay"></div>`;
}