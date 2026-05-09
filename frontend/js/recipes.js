/**
 * SmartRec — recipes.js  (v10 — Multi-User Favoriler)
 *
 * DÜZELTMELER:
 *  ✅ FAV_KEY artık sabit değil — her kullanıcı için ayrı anahtar
 *     (smartrec_favorites_ahmet_at_gmail_com gibi)
 *  ✅ _favKey() merkezi yardımcı: oturum açıksa user-specific, değilse genel
 *  ✅ Favorites.getAll / has / toggle hepsi _favKey() kullanıyor
 *  ✅ Oturum değiştiğinde (smartrec:auth-change) kart favori ikonları güncellenir
 */

import { Auth } from './auth.js';

// ─── Favori anahtar yönetimi ───────────────────────────────────────────────────
/**
 * Aktif kullanıcıya özel localStorage anahtarını döndürür.
 * Giriş yapılmamışsa misafir anahtarı kullanılır.
 */
function _favKey() {
  const user = Auth.getUser();
  if (!user?.email) return 'smartrec_favorites_guest';
  const suffix = user.email.replace('@', '_at_').replace(/\./g, '_');
  return `smartrec_favorites_${suffix}`;
}

/**
 * ✅ KALDIRILDI: _scoreFromId() artık kullanılmıyor.
 * Puan artık doğrudan recipes.json'daki t.puan alanından okunur.
 * (t.puan bir string olarak saklandığı için parseFloat ile sayıya dönüştürülür.)
 */


// ─── Favori Yönetimi ──────────────────────────────────────────────────────────
export const Favorites = {
  getAll() {
    try { return JSON.parse(localStorage.getItem(_favKey()) || '[]'); }
    catch { return []; }
  },
  has(id) {
    return this.getAll().includes(id);
  },
  toggle(id) {
    let favs = this.getAll();
    if (favs.includes(id)) {
      favs = favs.filter(f => f !== id);
    } else {
      favs.push(id);
    }
    localStorage.setItem(_favKey(), JSON.stringify(favs));
    window.dispatchEvent(new CustomEvent('smartrec:fav-change', { detail: { id, favs } }));
    return favs.includes(id);
  }
};

// Oturum açıp kapandığında kart favori ikonları yenilenmeli.
// initRecipeCardEvents'ten sonra render edilmiş kartlardaki kalp ikonlarını günceller.
window.addEventListener('smartrec:auth-change', () => {
  document.querySelectorAll('.recipe-card').forEach(card => {
    const id     = Number(card.dataset.id);
    const favBtn = card.querySelector('.fav-btn');
    if (!favBtn) return;
    const isFav = Favorites.has(id);
    favBtn.textContent = isFav ? '♥' : '♡';
    favBtn.style.color = isFav ? '#C44B1C' : '';
    favBtn.classList.toggle('fav-btn--active', isFav);
  });
});

// ─── JSON'DAN DİNAMİK VERİ ÇEKME ─────────────────────────────────────────────
export let MOCK_RECIPES = [];

try {
  const response = await fetch('../data/recipes.json?v=' + new Date().getTime());
  const data     = await response.json();

  MOCK_RECIPES = data.tarifler.map(t => {
    let rawTags = [...(t.etiketler || []), t.kategori, t.zorluk];
    rawTags = [...new Set(rawTags.filter(Boolean))];

    return {
      id        : t.id,
      title     : t.ad.charAt(0).toUpperCase() + t.ad.slice(1),
      desc      : t.aciklama,
      image     : t.resim_url || t.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
      time      : t.toplam_sure || t.hazirlanma_suresi || "30 dk",
      difficulty: t.zorluk ? (t.zorluk.charAt(0).toUpperCase() + t.zorluk.slice(1)) : "Orta",
      calories  : t.kalori || 0,

      tags: rawTags.map(tag => {
        let lower = String(tag).toLowerCase();
        if (lower === 'ana yemek') return 'ana-menu';
        if (lower === 'çorba')     return 'corba';
        if (lower === 'tatlı')     return 'tatli';
        if (lower === 'sağlıklı') return 'saglikli';
        if (lower === 'kahvaltı') return 'kahvalti';
        const charMap = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', ' ': '-' };
        return lower.replace(/[çğıöşü ]/g, m => charMap[m] || m);
      }),

      tagLabels: rawTags.map(tag => {
        let lower = String(tag).toLowerCase();
        let emoji = '🏷️';
        if (lower === 'çorba')                  emoji = '🍲';
        else if (lower === 'ana yemek')          emoji = '🍽️';
        else if (lower === 'tatlı')              emoji = '🍮';
        else if (lower === 'salata')             emoji = '🥗';
        else if (lower === 'kahvaltı')           emoji = '🍳';
        else if (lower === 'vejetaryen')         emoji = '🌿';
        else if (lower === 'vegan')              emoji = '🌱';
        else if (lower === 'sağlıklı')           emoji = '💚';
        else if (lower === 'geleneksel')         emoji = '🫕';
        else if (lower === 'kolay' || lower === 'pratik') emoji = '⚡';
        return `${emoji} ${tag.charAt(0).toUpperCase() + tag.slice(1)}`;
      }),

      emoji      : '✨',
      score: t.puan != null ? parseFloat(t.puan).toFixed(1) : "—",
      ingredients: t.malzemeler
        ? t.malzemeler.map(m => typeof m === 'object' ? `${m.miktar} ${m.birim} ${m.isim}` : m)
        : [],
      steps: t.hazirlanis || []
    };
  });

  console.log("✅ Tarifler JSON'dan başarıyla çekildi!", MOCK_RECIPES);
} catch (error) {
  console.error("❌ JSON çekilemedi. Yolu kontrol et ('../data/recipes.json').", error);
}


// ─── Kalori Kayıt ─────────────────────────────────────────────────────────────
export function logCalories(recipeId) {
  const recipe = MOCK_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;
  const key   = 'smartrec_calories_log';
  const log   = JSON.parse(localStorage.getItem(key) || '[]');
  const today = new Date().toISOString().split('T')[0];
  log.push({ date: today, recipeId, title: recipe.title, calories: recipe.calories, ts: Date.now() });
  localStorage.setItem(key, JSON.stringify(log));
  window.dispatchEvent(new CustomEvent('smartrec:calorie-logged', { detail: { recipe } }));

  try {
    const user = (typeof Auth !== 'undefined') ? Auth.getUser() : null;
    fetch('http://localhost:5000/api/calories/add', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        email   : user?.email || '',
        yemek   : recipe.title,
        kalori  : recipe.calories
      })
    }).catch(() => {});
  } catch {}
}

function _showAuthToast(message = 'Bu özellik için giriş yapmanız gerekiyor.') {
  if (typeof window.srToast === 'function') {
    window.srToast({
      type: 'auth', icon: '🔒', title: 'Giriş Gerekli', sub: message,
      duration: 4000, action: { href: 'login.html', label: 'Giriş Yap →' }
    });
  } else {
    document.getElementById('_authToast')?.remove();
    const toast = document.createElement('div');
    toast.id = '_authToast';
    toast.style.cssText = `position:fixed;bottom:1.75rem;right:1.5rem;background:#2A1A0E;color:#F5E6D0;padding:1rem 1.1rem;border-radius:16px;font-size:0.875rem;font-family:'DM Sans',sans-serif;z-index:99999;display:flex;align-items:flex-start;gap:0.7rem;box-shadow:0 8px 32px rgba(0,0,0,0.18);width:min(300px,calc(100vw - 2rem));border:1px solid rgba(255,255,255,0.07);`;
    toast.innerHTML = `<span style="font-size:1.1rem">🔒</span><div style="flex:1"><div style="font-weight:700;font-size:0.875rem;margin-bottom:3px">Giriş Gerekli</div><div style="font-size:0.78rem;opacity:0.72">${message}</div><a href="login.html" style="display:inline-block;margin-top:0.5rem;background:#E8A06A;color:#1A1208;font-size:0.77rem;font-weight:700;padding:0.28rem 0.85rem;border-radius:50px;text-decoration:none">Giriş Yap →</a></div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}

function _ensureDetailPanel() {
  if (document.getElementById('recipeDetailPanel')) return;
  const overlay = document.createElement('div');
  overlay.id = 'recipeDetailOverlay';
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:8000;opacity:0;pointer-events:none;transition:opacity 0.3s;`;
  overlay.addEventListener('click', closeRecipeDetail);
  const panel = document.createElement('div');
  panel.id = 'recipeDetailPanel';
  panel.setAttribute('aria-hidden', 'true');
  panel.style.cssText = `position:fixed;top:0;right:-520px;width:min(500px,100vw);height:100vh;background:#fff;z-index:8001;overflow-y:auto;box-shadow:-4px 0 40px rgba(0,0,0,0.14);transition:right 0.35s cubic-bezier(0.34,1.1,0.64,1);display:flex;flex-direction:column;`;
  document.body.appendChild(overlay);
  document.body.appendChild(panel);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeRecipeDetail(); });
}

export function closeRecipeDetail() {
  const panel   = document.getElementById('recipeDetailPanel');
  const overlay = document.getElementById('recipeDetailOverlay');
  if (!panel) return;
  panel.style.right = '-520px';
  panel.setAttribute('aria-hidden', 'true');
  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';
  document.body.style.overflow = '';
}

export function openRecipeDetail(recipeId) {
  const recipe = MOCK_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;
  _ensureDetailPanel();
  const panel      = document.getElementById('recipeDetailPanel');
  const overlay    = document.getElementById('recipeDetailOverlay');
  const isLoggedIn = Auth.isLoggedIn();
  // DÜZELTİLDİ: Favorites.has() artık _favKey() kullandığından
  // doğru kullanıcının favorisini okur.
  const isFav      = isLoggedIn && Favorites.has(recipe.id);
  const diffColor  = recipe.difficulty === 'Kolay' ? '#2D7A4F'
                   : recipe.difficulty === 'Zor'   ? '#C0392B' : '#6B5E4E';

  const ingredientsList = recipe.ingredients.map(ing =>
    `<li style="display:flex;align-items:center;gap:0.6rem;padding:0.45rem 0;border-bottom:1px solid #f5f5f5;font-size:0.88rem;">
       <span style="width:7px;height:7px;border-radius:50%;background:var(--clr-accent);flex-shrink:0"></span>${ing}
     </li>`
  ).join('');

  const stepsList = (recipe.steps || []).map((step, i) =>
    `<li style="display:flex;gap:0.85rem;padding:0.6rem 0;border-bottom:1px solid #f5f5f5;font-size:0.88rem;line-height:1.55;">
       <span style="width:24px;height:24px;border-radius:50%;background:var(--clr-accent);color:#fff;font-size:0.72rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">${i+1}</span>
       <span>${step}</span>
     </li>`
  ).join('');

  const missingBtnHtml = isLoggedIn
    ? `<button id="detailMissingBtn" class="btn btn--outline btn--sm" style="flex:1;">🛒 Eksikleri Ekle</button>`
    : `<button class="btn btn--outline btn--sm guest-action-btn" style="flex:1;" data-msg="Eksik malzemeleri listeye eklemek için giriş yapın.">🛒 Eksikleri Ekle</button>`;

  const cookedBtnHtml = isLoggedIn
    ? `<button id="detailCookedBtn" class="btn btn--success btn--sm" style="flex:1;">✅ Pişirdim</button>`
    : `<button class="btn btn--success btn--sm guest-action-btn" style="flex:1;opacity:0.7;" data-msg="Yaptım olarak işaretlemek için giriş yapın.">✅ Pişirdim</button>`;

  const favBtnHtml = isLoggedIn
    ? `<button id="detailFavBtn" class="btn btn--ghost btn--sm" style="min-width:40px;${isFav ? 'color:#C44B1C;' : ''}" aria-label="Favorilere ekle">${isFav ? '♥' : '♡'}</button>`
    : `<button class="btn btn--ghost btn--sm guest-action-btn" style="min-width:40px;" data-msg="Favorilere eklemek için giriş yapın." aria-label="Favorilere ekle">♡</button>`;

  panel.innerHTML = `
    <div style="position:relative;flex-shrink:0;">
      <img src="${recipe.image}" alt="${recipe.title}" style="width:100%;height:240px;object-fit:cover;display:block;" onerror="this.style.display='none'">
      <button onclick="window.closeRecipeDetail()" aria-label="Geri" style="position:absolute;top:1rem;left:1rem;background:rgba(255,255,255,0.9);border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);">←</button>
      <span style="position:absolute;bottom:1rem;right:1rem;background:#fff;border-radius:50px;padding:0.3rem 0.85rem;font-size:0.75rem;font-weight:700;color:${diffColor};box-shadow:0 2px 8px rgba(0,0,0,0.1);">${recipe.difficulty}</span>
    </div>
    <div style="padding:1.5rem;flex:1;overflow-y:auto;">
      <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.75rem;">${(recipe.tagLabels||[]).map(l=>`<span class="recipe-tag">${l}</span>`).join('')}</div>
      <h2 style="font-family:var(--font-display);font-size:1.5rem;margin-bottom:0.5rem;color:var(--clr-text);">${recipe.title}</h2>
      <p style="color:var(--clr-text-muted);font-size:0.9rem;line-height:1.6;margin-bottom:1.25rem;">${recipe.desc}</p>
      <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem;">
        <div style="background:var(--clr-bg);border-radius:12px;padding:0.75rem 1.1rem;text-align:center;flex:1;min-width:80px;"><div style="font-size:1.1rem;margin-bottom:2px;">⏱</div><div style="font-size:0.75rem;color:var(--clr-text-muted);">Süre</div><div style="font-size:0.9rem;font-weight:700;">${recipe.time}</div></div>
        <div style="background:var(--clr-bg);border-radius:12px;padding:0.75rem 1.1rem;text-align:center;flex:1;min-width:80px;"><div style="font-size:1.1rem;margin-bottom:2px;">🔥</div><div style="font-size:0.75rem;color:var(--clr-text-muted);">Kalori</div><div style="font-size:0.9rem;font-weight:700;">${recipe.calories} kcal</div></div>
        <div style="background:var(--clr-bg);border-radius:12px;padding:0.75rem 1.1rem;text-align:center;flex:1;min-width:80px;"><div style="font-size:1.1rem;margin-bottom:2px;">★</div><div style="font-size:0.75rem;color:var(--clr-text-muted);">Puan</div><div style="font-size:0.9rem;font-weight:700;">${recipe.score}</div></div>
      </div>
      <h3 style="font-family:var(--font-display);font-size:1rem;margin-bottom:0.75rem;padding-bottom:0.4rem;border-bottom:2px solid var(--clr-accent-light);">🧂 Malzemeler</h3>
      <ul style="list-style:none;padding:0;margin:0 0 1.5rem;">${ingredientsList}</ul>
      <h3 style="font-family:var(--font-display);font-size:1rem;margin-bottom:0.75rem;padding-bottom:0.4rem;border-bottom:2px solid var(--clr-accent-light);">👩‍🍳 Yapılışı</h3>
      <ol style="list-style:none;padding:0;margin:0 0 1.5rem;">${stepsList}</ol>
      <div style="display:flex;gap:0.6rem;flex-wrap:wrap;padding-top:1rem;border-top:1.5px solid var(--clr-border);">${missingBtnHtml}${cookedBtnHtml}${favBtnHtml}</div>
      ${!isLoggedIn ? `<div style="margin-top:1rem;background:#FFF5F0;border:1.5px solid var(--clr-accent-light);border-radius:12px;padding:1rem;text-align:center;"><p style="font-size:0.85rem;color:var(--clr-text-muted);margin-bottom:0.6rem;">Favorileme, kalori takibi ve alışveriş listesi için üye olun.</p><div style="display:flex;gap:0.5rem;justify-content:center;"><a href="login.html" class="btn btn--primary btn--sm">Giriş Yap</a><a href="login.html?tab=register" class="btn btn--outline btn--sm">Kayıt Ol</a></div></div>` : ''}
    </div>`;

  if (isLoggedIn) {
    document.getElementById('detailMissingBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('detailMissingBtn');
      btn.textContent = '⏳ Ekleniyor...'; btn.disabled = true;
      try {
        const { addMissingToShopping } = await import('./remzi.js');
        addMissingToShopping(recipe.ingredients);
        btn.textContent = '✅ Eklendi!';
      } catch {
        btn.textContent = '⚠️ Hata'; btn.disabled = false;
      }
    });

    document.getElementById('detailCookedBtn')?.addEventListener('click', () => {
      logCalories(recipe.id);
      const btn = document.getElementById('detailCookedBtn');
      btn.textContent = '✅ Kaydedildi'; btn.disabled = true;
      btn.style.background = '#2D7A4F';
    });

    const favBtn = document.getElementById('detailFavBtn');
    favBtn?.addEventListener('click', () => {
      const nowFav = Favorites.toggle(recipe.id);
      favBtn.textContent  = nowFav ? '♥' : '♡';
      favBtn.style.color  = nowFav ? '#C44B1C' : '';
      // Backend'e de gönder (opsiyonel)
      const user = Auth.getUser();
      fetch('http://localhost:5000/api/favorites/toggle', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          email   : user?.email || '',
          recipeId: recipe.id,
          title   : recipe.title,
          favorited: nowFav
        })
      }).catch(() => {});
      // Kart ikonunu güncelle
      document.querySelectorAll(`.recipe-card[data-id="${recipe.id}"] .fav-btn`).forEach(b => {
        b.textContent = nowFav ? '♥' : '♡';
        b.style.color = nowFav ? '#C44B1C' : '';
        b.classList.toggle('fav-btn--active', nowFav);
      });
    });
  }

  panel.querySelectorAll('.guest-action-btn').forEach(btn => {
    btn.addEventListener('click', () => _showAuthToast(btn.dataset.msg));
  });

  panel.style.right = '0';
  panel.setAttribute('aria-hidden', 'false');
  overlay.style.opacity = '1';
  overlay.style.pointerEvents = 'all';
  document.body.style.overflow = 'hidden';
}

window.openRecipeDetail  = openRecipeDetail;
window.closeRecipeDetail = closeRecipeDetail;

export function createRecipeCard(recipe, opts = {}) {
  const { showDetail = true, showMissing = false, showCooked = false } = opts;
  const isLoggedIn = Auth.isLoggedIn();
  // DÜZELTİLDİ: Favorites.has() doğru kullanıcı anahtarını kullanır.
  const isFav      = isLoggedIn && Favorites.has(recipe.id);
  const tagBadges  = (recipe.tagLabels || []).map(l => `<span class="recipe-tag">${l}</span>`).join('');
  const diffClass  = recipe.difficulty === 'Kolay' ? 'recipe-tag--green'
                   : recipe.difficulty === 'Zor'   ? 'recipe-tag--red' : 'recipe-tag--gray';
  const imgMarkup  = recipe.image ? `<img class="recipe-card__img-el" src="${recipe.image}" alt="${recipe.title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : '';
  const placeholder = `<div class="recipe-card__img-placeholder" style="${recipe.image ? 'display:none' : ''}"><span class="placeholder-icon">${recipe.emoji}</span><span class="placeholder-label">Görsel Yükleniyor</span></div>`;
  const detailBtn  = showDetail ? `<button class="btn btn--primary detail-btn" data-id="${recipe.id}">Detayları Gör</button>` : '';
  const missingBtn = showMissing && recipe.ingredients?.length
    ? (isLoggedIn
        ? `<button class="btn btn--outline btn--sm missing-btn" data-id="${recipe.id}">🛒 Eksikleri Ekle</button>`
        : `<button class="btn btn--outline btn--sm guest-gate-btn" data-msg="Eksik malzemeleri listeye eklemek için giriş yapın.">🛒 Eksikleri Ekle</button>`)
    : '';
  const cookedBtn  = showCooked
    ? (isLoggedIn
        ? `<button class="btn btn--success btn--sm cooked-btn" data-id="${recipe.id}">✅ Pişirdim</button>`
        : `<button class="btn btn--success btn--sm guest-gate-btn" style="opacity:0.7;" data-msg="Yaptım olarak işaretlemek için giriş yapın.">✅ Pişirdim</button>`)
    : '';
  const favBtn     = showDetail
    ? (isLoggedIn
        ? `<button class="btn btn--ghost fav-btn${isFav ? ' fav-btn--active' : ''}" aria-label="Favorilere ekle" style="${isFav ? 'color:#C44B1C;' : ''}">${isFav ? '♥' : '♡'}</button>`
        : `<button class="btn btn--ghost guest-gate-btn" aria-label="Favorilere ekle" data-msg="Favorilere eklemek için giriş yapın.">♡</button>`)
    : '';

  return `
<article class="recipe-card" data-id="${recipe.id}" data-tags='${JSON.stringify(recipe.tags)}'>
  <div class="recipe-card__img-wrap">${imgMarkup}${placeholder}<span class="recipe-card__badge ${diffClass}">${recipe.difficulty}</span></div>
  <div class="recipe-card__body">
    <div class="recipe-card__tags">${tagBadges}</div>
    <h3 class="recipe-card__title">${recipe.title}</h3>
    <p class="recipe-card__desc">${recipe.desc}</p>
  </div>
  <div class="recipe-card__meta">
    <span class="meta-item">⏱ <strong>${recipe.time}</strong></span>
    <span class="meta-item">🔥 <strong>${recipe.calories}</strong> kcal</span>
    <span class="flavor-score">★ ${recipe.score}</span>
  </div>
  ${showDetail ? `<div class="recipe-card__footer">${detailBtn}${missingBtn}${cookedBtn}${favBtn}</div>` : ''}
</article>`;
}

export function renderRecipeGrid(containerId, recipes, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = recipes.map(r => createRecipeCard(r, opts)).join('');
  _initCardEvents(container, recipes);
}

export function initRecipeCardEvents(container, recipes) {
  _initCardEvents(container, recipes);
}

function _initCardEvents(container, recipes) {
  container.querySelectorAll('.detail-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openRecipeDetail(Number(btn.dataset.id)); });
  });

  container.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = Number(btn.closest('.recipe-card')?.dataset.id);
      if (!id) return;
      const nowFav = Favorites.toggle(id);
      btn.textContent = nowFav ? '♥' : '♡';
      btn.style.color = nowFav ? '#C44B1C' : '';
      btn.classList.toggle('fav-btn--active', nowFav);
    });
  });

  container.querySelectorAll('.missing-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const recipe = recipes.find(r => r.id === Number(btn.dataset.id));
      if (!recipe?.ingredients) return;
      btn.textContent = '⏳ Ekleniyor...'; btn.disabled = true;
      try {
        const { addMissingToShopping } = await import('./remzi.js');
        addMissingToShopping(recipe.ingredients);
        btn.textContent = '✅ Eklendi!';
      } catch {
        btn.textContent = '⚠️ Hata'; btn.disabled = false;
      }
    });
  });

  container.querySelectorAll('.cooked-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      logCalories(Number(btn.dataset.id));
      btn.textContent = '✅ Kaydedildi';
      btn.disabled    = true;
    });
  });

  container.querySelectorAll('.guest-gate-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); _showAuthToast(btn.dataset.msg); });
  });
}

window.openRecipeDetail = openRecipeDetail;