/**
 * SmartRec — recipes.js  (v9)
 * ✅ Favoriler localStorage'a kaydediliyor
 * ✅ Genişletilmiş kategori & diyet etiketleri
 * ✅ Daha fazla tarif eklendi
 */

import { Auth } from './auth.js';

// ─── Favori Yönetimi ──────────────────────────────────────────────────────────
const FAV_KEY = 'smartrec_favorites';

export const Favorites = {
  getAll() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); }
    catch { return []; }
  },
  has(id) { return this.getAll().includes(id); },
  toggle(id) {
    let favs = this.getAll();
    if (favs.includes(id)) {
      favs = favs.filter(f => f !== id);
    } else {
      favs.push(id);
    }
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    window.dispatchEvent(new CustomEvent('smartrec:fav-change', { detail: { id, favs } }));
    return favs.includes(id);
  }
};

export const MOCK_RECIPES = [
  {
    id: 1, title: 'Mercimek Çorbası',
    desc: 'Geleneksel Türk mutfağının vazgeçilmezi, kadife dokulu mercimek çorbası.',
    time: '25 dk', difficulty: 'Kolay', calories: 180, score: '9.4',
    tags: ['geleneksel', 'vejetaryen', 'corba', 'vegan', 'glutensiz'],
    tagLabels: ['🍲 Çorba', '🌿 Vejetaryen', '🌱 Vegan', '🚫🌾 Glutensiz'],
    emoji: '🍲',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop',
    ingredients: ['kırmızı mercimek', 'soğan', 'havuç', 'zeytinyağı', 'tuz', 'kimyon'],
    steps: ['Soğan ve havucu ince ince doğrayın.','Zeytinyağında soğanları kavurun.','Mercimek ve havucu ekleyip 2 dk daha kavurun.','4 su bardağı su ekleyip 20 dakika pişirin.','Blenderdan geçirin, tuz ve kimyon ekleyin.','Servis ederken üzerine kırmızı pul biber sosun gezdirin.']
  },
  {
    id: 2, title: 'Menemen',
    desc: 'Taze domates ve biberlerle hazırlanan, kahvaltının yıldızı klasik Türk omleti.',
    time: '15 dk', difficulty: 'Kolay', calories: 220, score: '9.1',
    tags: ['kolay', 'vejetaryen', 'ana-menu', 'glutensiz'],
    tagLabels: ['⚡ Kolay', '🌿 Vejetaryen', '🍽 Ana Menü', '🚫🌾 Glutensiz'],
    emoji: '🍳',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop',
    ingredients: ['domates', 'yeşil biber', 'yumurta', 'zeytinyağı', 'tuz'],
    steps: ['Biberleri ince halkalar halinde doğrayın.','Zeytinyağında biberleri 3 dk kavurun.','Domatesleri ekleyip suyunu çekene kadar pişirin.','Yumurtaları kırın ve karıştırarak pişirin.','Tuz ekleyip sıcak servis edin.']
  },
  {
    id: 3, title: 'Zeytinyağlı Enginar',
    desc: 'İzmir usulü, limon ve zeytinyağıyla pişirilmiş hafif ve sağlıklı enginar.',
    time: '50 dk', difficulty: 'Orta', calories: 145, score: '8.8',
    tags: ['saglikli', 'vejetaryen', 'ana-menu', 'vegan', 'glutensiz', 'sportif'],
    tagLabels: ['🥗 Sağlıklı', '🌿 Vejetaryen', '🌱 Vegan', '💪 Sportif'],
    emoji: '🥦',
    image: 'https://images.unsplash.com/photo-1540914124281-342587941389?w=600&auto=format&fit=crop',
    ingredients: ['enginar', 'limon', 'zeytinyağı', 'soğan', 'dereotu', 'tuz'],
    steps: ['Enginarları temizleyip limonlu suya bırakın.','Soğanı ince doğrayıp zeytinyağında kavurun.','Enginarları ekleyin, su ve limon suyu ilave edin.','Kısık ateşte 35-40 dakika pişirin.','Dereotu ile süsleyip soğuk servis edin.']
  },
  {
    id: 4, title: 'Tavuk Şiş',
    desc: 'Marine edilmiş tavuk parçaları, közlenmiş sebzelerle birlikte servis edilir.',
    time: '35 dk', difficulty: 'Orta', calories: 310, score: '9.6',
    tags: ['saglikli', 'ana-menu', 'glutensiz', 'sportif'],
    tagLabels: ['🥗 Sağlıklı', '🍽 Ana Menü', '🚫🌾 Glutensiz', '💪 Sportif'],
    emoji: '🍗',
    image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&auto=format&fit=crop',
    ingredients: ['tavuk göğsü', 'zeytinyağı', 'sarımsak', 'kekik', 'biber', 'tuz'],
    steps: ['Tavukları küp şeklinde kesin.','Zeytinyağı, sarımsak, kekik, tuz ve biberle marine edin (min. 1 saat).','Şişlere dizin, aralarına sebze ekleyebilirsiniz.','Izgara veya fırında 180°C\'de 25 dk pişirin.','Yanında pilav veya salata ile servis edin.']
  },
  {
    id: 5, title: 'Baklava',
    desc: 'Antep fıstıklı, ince yufkalı, şerbetli Türk tatlısının kraliçesi.',
    time: '90 dk', difficulty: 'Zor', calories: 480, score: '9.9',
    tags: ['tatli', 'geleneksel', 'vejetaryen'],
    tagLabels: ['🍮 Tatlı', '🫕 Geleneksel', '🌿 Vejetaryen'],
    emoji: '🍮',
    image: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=600&auto=format&fit=crop',
    ingredients: ['yufka', 'antep fıstığı', 'tereyağı', 'şeker', 'su', 'limon'],
    steps: ['Şerbeti hazırlayın: şeker, su ve limonla kaynatın, soğutun.','Tepsiye tereyağlı yufkaları kat kat serin.','Ortasına fıstık serpin, üstünü de yufkayla kapatın.','Baklavayı dilimleyin, üzerine tereyağı gezdirin.','Önceden ısıtılmış 170°C fırında 45 dk pişirin.','Fırından çıkınca soğuk şerbet dökün, dinlendirin.']
  },
  {
    id: 6, title: 'Kısır',
    desc: 'İnce bulgur, taze maydanoz ve nar ekşisiyle hazırlanan hafif meze.',
    time: '20 dk', difficulty: 'Kolay', calories: 195, score: '8.7',
    tags: ['kolay', 'vejetaryen', 'saglikli', 'salata', 'vegan'],
    tagLabels: ['⚡ Kolay', '🌿 Vejetaryen', '🥗 Salata', '🌱 Vegan'],
    emoji: '🥗',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop',
    ingredients: ['ince bulgur', 'domates salçası', 'maydanoz', 'nar ekşisi', 'zeytinyağı', 'tuz'],
    steps: ['Bulgurun üzerine kaynar su dökün, kabarmasını bekleyin.','Salça ve zeytinyağıyla yoğurun.','Nar ekşisi ve tuzu ekleyin.','İnce kıyılmış maydanozu ilave edin, karıştırın.','En az 15 dk dinlendirip servis edin.']
  },
  {
    id: 7, title: 'İmam Bayıldı',
    desc: 'Zeytinyağında pişirilmiş domates ve soğan dolgulu, fırında yumuşatılmış patlıcan.',
    time: '60 dk', difficulty: 'Orta', calories: 165, score: '9.0',
    tags: ['geleneksel', 'vejetaryen', 'ana-menu', 'vegan', 'glutensiz'],
    tagLabels: ['🫕 Geleneksel', '🌿 Vejetaryen', '🍽 Ana Menü', '🌱 Vegan'],
    emoji: '🍆',
    image: 'https://images.unsplash.com/photo-1572453800999-e8d2d1589b7c?w=600&auto=format&fit=crop',
    ingredients: ['patlıcan', 'domates', 'soğan', 'sarımsak', 'zeytinyağı', 'maydanoz'],
    steps: ['Patlıcanları yıkayıp boyuna yarın, tuzlu suda bekletin.','Soğan ve sarımsağı zeytinyağında kavurun.','Domatesleri ekleyip 10 dk daha pişirin.','Harci patlıcanların içine doldurun.','Üzerine zeytinyağı gezdirin, fırında 180°C\'de 35 dk pişirin.','Soğuyunca servis edin.']
  },
  {
    id: 8, title: 'Fırında Levrek',
    desc: 'Limon, sarımsak ve dereotu ile marine edilmiş, çıtır görünümlü levrek filetosu.',
    time: '40 dk', difficulty: 'Orta', calories: 250, score: '9.3',
    tags: ['saglikli', 'ana-menu', 'glutensiz', 'sportif'],
    tagLabels: ['🥗 Sağlıklı', '🍽 Ana Menü', '🚫🌾 Glutensiz', '💪 Sportif'],
    emoji: '🐟',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop',
    ingredients: ['levrek', 'limon', 'sarımsak', 'dereotu', 'zeytinyağı', 'tuz'],
    steps: ['Levreği yıkayıp kağıt havluyla kurulayın.','Sarımsak, limon suyu, zeytinyağı ve dereotunu karıştırın.','Balığı her iki yüzünden de marine edin.','200°C fırında 25-30 dakika pişirin.','Limon dilimleri ve dereotu ile servis edin.']
  },
  {
    id: 9, title: 'Yeşil Mercimek Salatası',
    desc: 'Yeşil mercimek, taze sebzeler ve limon soslu hafif bir protein bombası salata.',
    time: '30 dk', difficulty: 'Kolay', calories: 210, score: '8.9',
    tags: ['saglikli', 'vejetaryen', 'salata', 'vegan', 'glutensiz', 'sportif'],
    tagLabels: ['🥗 Salata', '🌱 Vegan', '🚫🌾 Glutensiz', '💪 Sportif'],
    emoji: '🥗',
    image: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=600&auto=format&fit=crop',
    ingredients: ['yeşil mercimek', 'domates', 'salatalık', 'maydanoz', 'limon', 'zeytinyağı'],
    steps: ['Mercimeği haşlayıp soğutun.','Domates ve salatalığı küp küp kesin.','Tüm malzemeleri karıştırın.','Limon suyu, zeytinyağı ve tuzla sosunu yapın.','Üzerine nar tanesi ekleyip servis edin.']
  },
  {
    id: 10, title: 'Tavuk Çorbası',
    desc: 'Ev yapımı tavuk suyu ile hazırlanan, şifalı geleneksel çorba.',
    time: '45 dk', difficulty: 'Kolay', calories: 160, score: '9.2',
    tags: ['geleneksel', 'corba', 'glutensiz'],
    tagLabels: ['🍲 Çorba', '🫕 Geleneksel', '🚫🌾 Glutensiz'],
    emoji: '🍗',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop',
    ingredients: ['tavuk', 'havuç', 'kereviz', 'soğan', 'tuz', 'karabiber', 'limon'],
    steps: ['Tavuğu büyük tencereye alın, su ekleyin.','Sebzeleri ekleyip 30 dakika kaynatın.','Tavuğu çıkarıp didikleyin.','Çorbayı süzün, tavuk etini geri ekleyin.','Limon suyu ve karabiberle tatlandırın.']
  },
  {
    id: 11, title: 'Sütlaç',
    desc: 'Fırında üzeri kızarıp karamelleşen, soğuk servis edilen geleneksel pirinçli sütlü tatlı.',
    time: '55 dk', difficulty: 'Orta', calories: 320, score: '9.5',
    tags: ['tatli', 'geleneksel', 'vejetaryen', 'glutensiz'],
    tagLabels: ['🍮 Tatlı', '🫕 Geleneksel', '🌿 Vejetaryen', '🚫🌾 Glutensiz'],
    emoji: '🍮',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop',
    ingredients: ['pirinç', 'süt', 'şeker', 'vanilya', 'tuz'],
    steps: ['Pirinci haşlayın.','Sütü kaynatıp pirinci ekleyin.','Şeker ve vanilyayı ilave edin, kısık ateşte pişirin.','Fırın kaplarına dökün.','200°C fırında üzeri kızarana kadar pişirin.','Soğuyunca buzdolabında bekletin.']
  },
  {
    id: 12, title: 'Protein Bowl',
    desc: 'Kinoa, tavuk, avokado ve renkli sebzelerden oluşan sporcu dostu besleyici kase.',
    time: '25 dk', difficulty: 'Kolay', calories: 420, score: '9.0',
    tags: ['saglikli', 'sportif', 'glutensiz', 'ana-menu'],
    tagLabels: ['💪 Sportif', '🥗 Sağlıklı', '🚫🌾 Glutensiz', '🍽 Ana Menü'],
    emoji: '🏋️',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop',
    ingredients: ['kinoa', 'tavuk göğsü', 'avokado', 'cherry domates', 'ıspanak', 'limon', 'zeytinyağı'],
    steps: ['Kinoayı haşlayın.','Tavuk göğsünü ızgarada pişirip dilimleyin.','Avokadonuzu dilimleyin.','Kasenize kinoa, tavuk, avokado ve taze sebzeleri dizin.','Limon suyu ve zeytinyağıyla sos yapın.','Üzerine döküp servis edin.']
  },
  {
    id: 13, title: 'Domates Çorbası',
    desc: 'Olgunlaşmış domateslerden yapılan, kremalı ve aromalı klasik çorba.',
    time: '30 dk', difficulty: 'Kolay', calories: 140, score: '8.6',
    tags: ['vejetaryen', 'corba', 'glutensiz'],
    tagLabels: ['🍲 Çorba', '🌿 Vejetaryen', '🚫🌾 Glutensiz'],
    emoji: '🍅',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop',
    ingredients: ['domates', 'soğan', 'sarımsak', 'zeytinyağı', 'krema', 'fesleğen', 'tuz'],
    steps: ['Soğan ve sarımsağı zeytinyağında kavurun.','Domatesleri ekleyip 15 dk pişirin.','Blenderdan geçirin.','Krema ekleyip karıştırın.','Fesleğen ile servis edin.']
  },
  {
    id: 14, title: 'Mevsim Salatası',
    desc: 'Renkli mevsim sebzeleriyle hazırlanmış, narenciyeli sos ile hafif bir salata.',
    time: '10 dk', difficulty: 'Kolay', calories: 95, score: '8.5',
    tags: ['saglikli', 'vejetaryen', 'salata', 'vegan', 'glutensiz', 'kolay'],
    tagLabels: ['🥗 Salata', '🌱 Vegan', '🚫🌾 Glutensiz', '⚡ Kolay'],
    emoji: '🥬',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop',
    ingredients: ['marul', 'domates', 'salatalık', 'kırmızı soğan', 'limon', 'zeytinyağı', 'tuz'],
    steps: ['Tüm sebzeleri yıkayıp doğrayın.','Büyük bir kaseye alın.','Limon suyu, zeytinyağı ve tuzla sos yapın.','Üzerine gezdirip hafifçe karıştırın.']
  },
  {
    id: 15, title: 'Künefe',
    desc: 'Antakya usulü, kaşar peynirli, şerbetli ve kadayıftan yapılan enfes tatlı.',
    time: '35 dk', difficulty: 'Orta', calories: 510, score: '9.8',
    tags: ['tatli', 'geleneksel', 'vejetaryen'],
    tagLabels: ['🍮 Tatlı', '🫕 Geleneksel', '🌿 Vejetaryen'],
    emoji: '🍯',
    image: 'https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=600&auto=format&fit=crop',
    ingredients: ['kadayıf', 'dil peyniri', 'tereyağı', 'şeker', 'su', 'limon', 'antep fıstığı'],
    steps: ['Şerbeti hazırlayın ve soğutun.','Kadayıfı eritilmiş tereyağıyla yoğurun.','Tepsiyi yağlayıp kadayıfın yarısını serin.','Peyniri yerleştirip kalan kadayıfı üste serin.','Orta ateşte her iki yüzü de altın sarısı olana kadar pişirin.','Sıcakken şerbet dökün, fıstıkla süsleyin.']
  },
  {
    id: 16, title: 'Çoban Salatası',
    desc: 'Taze domates, salatalık ve biberden oluşan Türk mutfağının vazgeçilmez salatası.',
    time: '10 dk', difficulty: 'Kolay', calories: 80, score: '8.8',
    tags: ['saglikli', 'vejetaryen', 'salata', 'vegan', 'glutensiz', 'kolay', 'geleneksel'],
    tagLabels: ['🥗 Salata', '🌱 Vegan', '🫕 Geleneksel', '⚡ Kolay'],
    emoji: '🥗',
    image: 'https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?w=600&auto=format&fit=crop',
    ingredients: ['domates', 'salatalık', 'yeşil biber', 'kırmızı soğan', 'maydanoz', 'zeytinyağı', 'limon'],
    steps: ['Tüm sebzeleri küçük küp şeklinde doğrayın.','Bir kaseye alın.','Zeytinyağı, limon suyu ve tuzla sos yapıp gezdirin.','Maydanoz ekleyip karıştırarak servis edin.']
  }
];

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
}

function _showAuthToast(message = 'Bu özellik için giriş yapmanız gerekiyor.') {
  if (typeof window.srToast === 'function') {
    window.srToast({
      type: 'auth',
      icon: '🔒',
      title: 'Giriş Gerekli',
      sub: message,
      duration: 4000,
      action: { href: 'login.html', label: 'Giriş Yap →' }
    });
  } else {
    // Fallback: recipes.js bağımsız kullanıldığında
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
  overlay.style.cssText = `position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:8000; opacity:0; pointer-events:none; transition:opacity 0.3s;`;
  overlay.addEventListener('click', closeRecipeDetail);
  const panel = document.createElement('div');
  panel.id = 'recipeDetailPanel';
  panel.setAttribute('aria-hidden', 'true');
  panel.style.cssText = `position:fixed; top:0; right:-520px; width:min(500px, 100vw); height:100vh; background:#fff; z-index:8001; overflow-y:auto; box-shadow:-4px 0 40px rgba(0,0,0,0.14); transition:right 0.35s cubic-bezier(0.34,1.1,0.64,1); display:flex; flex-direction:column;`;
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
  const panel   = document.getElementById('recipeDetailPanel');
  const overlay = document.getElementById('recipeDetailOverlay');
  const isLoggedIn = Auth.isLoggedIn();
  const isFav = isLoggedIn && Favorites.has(recipe.id);
  const diffColor = recipe.difficulty === 'Kolay' ? '#2D7A4F' : recipe.difficulty === 'Zor' ? '#C0392B' : '#6B5E4E';
  const ingredientsList = recipe.ingredients.map(ing => `<li style="display:flex; align-items:center; gap:0.6rem; padding:0.45rem 0; border-bottom:1px solid #f5f5f5; font-size:0.88rem;"><span style="width:7px;height:7px;border-radius:50%;background:var(--clr-accent);flex-shrink:0"></span>${ing}</li>`).join('');
  const stepsList = (recipe.steps || []).map((step, i) => `<li style="display:flex; gap:0.85rem; padding:0.6rem 0; border-bottom:1px solid #f5f5f5; font-size:0.88rem; line-height:1.55;"><span style="width:24px;height:24px;border-radius:50%;background:var(--clr-accent);color:#fff;font-size:0.72rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">${i+1}</span><span>${step}</span></li>`).join('');
  const missingBtnHtml = isLoggedIn ? `<button id="detailMissingBtn" class="btn btn--outline btn--sm" style="flex:1;">🛒 Eksikleri Ekle</button>` : `<button class="btn btn--outline btn--sm guest-action-btn" style="flex:1;" data-msg="Eksik malzemeleri listeye eklemek için giriş yapın.">🛒 Eksikleri Ekle</button>`;
  const cookedBtnHtml = isLoggedIn ? `<button id="detailCookedBtn" class="btn btn--success btn--sm" style="flex:1;">✅ Pişirdim</button>` : `<button class="btn btn--success btn--sm guest-action-btn" style="flex:1;opacity:0.7;" data-msg="Yaptım olarak işaretlemek için giriş yapın.">✅ Pişirdim</button>`;
  const favBtnHtml = isLoggedIn ? `<button id="detailFavBtn" class="btn btn--ghost btn--sm" style="min-width:40px;${isFav ? 'color:#C44B1C;' : ''}" aria-label="Favorilere ekle">${isFav ? '♥' : '♡'}</button>` : `<button class="btn btn--ghost btn--sm guest-action-btn" style="min-width:40px;" data-msg="Favorilere eklemek için giriş yapın." aria-label="Favorilere ekle">♡</button>`;

  panel.innerHTML = `
    <div style="position:relative; flex-shrink:0;">
      <img src="${recipe.image}" alt="${recipe.title}" style="width:100%;height:240px;object-fit:cover;display:block;" onerror="this.style.display='none'">
      <button onclick="window.closeRecipeDetail()" aria-label="Geri" style="position:absolute;top:1rem;left:1rem; background:rgba(255,255,255,0.9);border:none; border-radius:50%; width:36px; height:36px; cursor:pointer;font-size:1.1rem; display:flex; align-items:center; justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);">←</button>
      <span style="position:absolute; bottom:1rem; right:1rem; background:#fff; border-radius:50px;padding:0.3rem 0.85rem; font-size:0.75rem; font-weight:700; color:${diffColor};box-shadow:0 2px 8px rgba(0,0,0,0.1);">${recipe.difficulty}</span>
    </div>
    <div style="padding:1.5rem; flex:1; overflow-y:auto;">
      <div style="display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:0.75rem;">${(recipe.tagLabels||[]).map(l=>`<span class="recipe-tag">${l}</span>`).join('')}</div>
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
      try { const { addMissingToShopping } = await import('./remzi.js'); addMissingToShopping(recipe.ingredients); btn.textContent = '✅ Eklendi!'; }
      catch { btn.textContent = '⚠️ Hata'; btn.disabled = false; }
    });
    document.getElementById('detailCookedBtn')?.addEventListener('click', () => {
      logCalories(recipe.id);
      const btn = document.getElementById('detailCookedBtn');
      btn.textContent = '✅ Kaydedildi'; btn.disabled = true;
    });
    const favBtn = document.getElementById('detailFavBtn');
    favBtn?.addEventListener('click', () => {
      const nowFav = Favorites.toggle(recipe.id);
      favBtn.textContent = nowFav ? '♥' : '♡';
      favBtn.style.color = nowFav ? '#C44B1C' : '';
      document.querySelectorAll(`.recipe-card[data-id="${recipe.id}"] .fav-btn`).forEach(b => {
        b.textContent = nowFav ? '♥' : '♡'; b.style.color = nowFav ? '#C44B1C' : ''; b.classList.toggle('fav-btn--active', nowFav);
      });
    });
  }
  panel.querySelectorAll('.guest-action-btn').forEach(btn => { btn.addEventListener('click', () => _showAuthToast(btn.dataset.msg)); });
  panel.style.right = '0'; panel.setAttribute('aria-hidden', 'false');
  overlay.style.opacity = '1'; overlay.style.pointerEvents = 'all';
  document.body.style.overflow = 'hidden';
}

window.openRecipeDetail = openRecipeDetail;
window.closeRecipeDetail = closeRecipeDetail;

export function createRecipeCard(recipe, opts = {}) {
  const { showDetail = true, showMissing = false, showCooked = false } = opts;
  const isLoggedIn = Auth.isLoggedIn();
  const isFav = isLoggedIn && Favorites.has(recipe.id);
  const tagBadges = (recipe.tagLabels || []).map(l => `<span class="recipe-tag">${l}</span>`).join('');
  const diffClass = recipe.difficulty === 'Kolay' ? 'recipe-tag--green' : recipe.difficulty === 'Zor' ? 'recipe-tag--red' : 'recipe-tag--gray';
  const imgMarkup = recipe.image ? `<img class="recipe-card__img-el" src="${recipe.image}" alt="${recipe.title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : '';
  const placeholder = `<div class="recipe-card__img-placeholder" style="${recipe.image ? 'display:none' : ''}"><span class="placeholder-icon">${recipe.emoji}</span><span class="placeholder-label">Görsel Yükleniyor</span></div>`;
  const detailBtn = showDetail ? `<button class="btn btn--primary detail-btn" data-id="${recipe.id}">Detayları Gör</button>` : '';
  const missingBtn = showMissing && recipe.ingredients?.length ? (isLoggedIn ? `<button class="btn btn--outline btn--sm missing-btn" data-id="${recipe.id}">🛒 Eksikleri Ekle</button>` : `<button class="btn btn--outline btn--sm guest-gate-btn" data-msg="Eksik malzemeleri listeye eklemek için giriş yapın.">🛒 Eksikleri Ekle</button>`) : '';
  const cookedBtn = showCooked ? (isLoggedIn ? `<button class="btn btn--success btn--sm cooked-btn" data-id="${recipe.id}">✅ Pişirdim</button>` : `<button class="btn btn--success btn--sm guest-gate-btn" style="opacity:0.7;" data-msg="Yaptım olarak işaretlemek için giriş yapın.">✅ Pişirdim</button>`) : '';
  const favBtn = showDetail ? (isLoggedIn ? `<button class="btn btn--ghost fav-btn${isFav ? ' fav-btn--active' : ''}" aria-label="Favorilere ekle" style="${isFav ? 'color:#C44B1C;' : ''}">${isFav ? '♥' : '♡'}</button>` : `<button class="btn btn--ghost guest-gate-btn" aria-label="Favorilere ekle" data-msg="Favorilere eklemek için giriş yapın.">♡</button>`) : '';

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
      // Toast recipes.html'deki event listener'ı tetikler (smartrec:fav-change)
    });
  });
  container.querySelectorAll('.missing-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const recipe = recipes.find(r => r.id === Number(btn.dataset.id));
      if (!recipe?.ingredients) return;
      btn.textContent = '⏳ Ekleniyor...'; btn.disabled = true;
      try { const { addMissingToShopping } = await import('./remzi.js'); addMissingToShopping(recipe.ingredients); btn.textContent = '✅ Eklendi!'; }
      catch { btn.textContent = '⚠️ Hata'; btn.disabled = false; }
    });
  });
  container.querySelectorAll('.cooked-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); logCalories(Number(btn.dataset.id)); btn.textContent = '✅ Kaydedildi'; btn.disabled = true; });
  });
  container.querySelectorAll('.guest-gate-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); _showAuthToast(btn.dataset.msg); });
  });
}
window.openRecipeDetail = openRecipeDetail;