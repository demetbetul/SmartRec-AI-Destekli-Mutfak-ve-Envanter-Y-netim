/**
 * SmartRec — Tarif Verisi ve Kart Renderer'ı
 * API hazır olana kadar mock data kullanır.
 */

export const MOCK_RECIPES = [
  {
    id: 1,
    title: 'Mercimek Çorbası',
    desc: 'Geleneksel Türk mutfağının vazgeçilmezi, kadife dokulu mercimek çorbası.',
    time: '25 dk',
    difficulty: 'Kolay',
    calories: 180,
    score: '9.4',
    tags: ['geleneksel', 'vejetaryen'],
    tagLabels: ['🫕 Geleneksel', '🌿 Vejetaryen'],
    emoji: '🍲',
    image: null,
  },
  {
    id: 2,
    title: 'Menemen',
    desc: 'Taze domates ve biberlerle hazırlanan, kahvaltının yıldızı klasik Türk omleti.',
    time: '15 dk',
    difficulty: 'Kolay',
    calories: 220,
    score: '9.1',
    tags: ['kolay', 'vejetaryen'],
    tagLabels: ['⚡ Kolay', '🌿 Vejetaryen'],
    emoji: '🍳',
    image: null,
  },
  {
    id: 3,
    title: 'Zeytinyağlı Enginar',
    desc: 'İzmir usulü, limon ve zeytinyağıyla pişirilmiş hafif ve sağlıklı enginar.',
    time: '50 dk',
    difficulty: 'Orta',
    calories: 145,
    score: '8.8',
    tags: ['saglikli', 'vejetaryen'],
    tagLabels: ['🥗 Sağlıklı'],
    emoji: '🥦',
    image: null,
  },
  {
    id: 4,
    title: 'Tavuk Şiş',
    desc: 'Marine edilmiş tavuk parçaları, közlenmiş sebzelerle birlikte servis edilir.',
    time: '35 dk',
    difficulty: 'Orta',
    calories: 310,
    score: '9.6',
    tags: ['saglikli'],
    tagLabels: ['🥗 Sağlıklı'],
    emoji: '🍗',
    image: null,
  },
  {
    id: 5,
    title: 'Baklava',
    desc: 'Antep fıstıklı, ince yufkalı, şerbetli Türk tatlısının kraliçesi.',
    time: '90 dk',
    difficulty: 'Zor',
    calories: 480,
    score: '9.9',
    tags: ['tatli', 'geleneksel'],
    tagLabels: ['🍮 Tatlı', '🫕 Geleneksel'],
    emoji: '🍮',
    image: null,
  },
  {
    id: 6,
    title: 'Kısır',
    desc: 'İnce bulgur, taze maydanoz ve narlı nar ekşisiyle hazırlanan hafif meze.',
    time: '20 dk',
    difficulty: 'Kolay',
    calories: 195,
    score: '8.7',
    tags: ['kolay', 'vejetaryen', 'saglikli'],
    tagLabels: ['⚡ Kolay', '🌿 Vejetaryen'],
    emoji: '🥗',
    image: null,
  },
  {
    id: 7,
    title: 'İmam Bayıldı',
    desc: 'Zeytin yağında pişirilmiş domates ve soğan dolgulu, fırında yumuşatılmış patlıcan.',
    time: '60 dk',
    difficulty: 'Orta',
    calories: 165,
    score: '9.0',
    tags: ['geleneksel', 'vejetaryen'],
    tagLabels: ['🫕 Geleneksel', '🌿 Vejetaryen'],
    emoji: '🍆',
    image: null,
  },
  {
    id: 8,
    title: 'Fırında Levrek',
    desc: 'Limon, sarımsak ve dereotu ile marine edilmiş, çıtır görünümlü levrek filetosu.',
    time: '40 dk',
    difficulty: 'Orta',
    calories: 250,
    score: '9.3',
    tags: ['saglikli'],
    tagLabels: ['🥗 Sağlıklı'],
    emoji: '🐟',
    image: null,
  },
];

/**
 * Tarif kartı HTML oluşturur.
 * @param {Object} recipe
 * @param {boolean} [showDetail=true]
 */
export function createRecipeCard(recipe, showDetail = true) {
  const tagBadges = (recipe.tagLabels || []).map(l => `<span class="recipe-tag">${l}</span>`).join('');
  const diffClass = recipe.difficulty === 'Kolay' ? 'recipe-tag--green' : recipe.difficulty === 'Zor' ? 'recipe-tag--red' : 'recipe-tag--gray';

  const imgMarkup = recipe.image
    ? `<img class="recipe-card__img-el" src="${recipe.image}" alt="${recipe.title}" loading="lazy">`
    : `<div class="recipe-card__img-placeholder">
         <span class="placeholder-icon">${recipe.emoji}</span>
         <span class="placeholder-label">AI Görsel Bekleniyor</span>
       </div>`;

  return `
    <article class="recipe-card" data-id="${recipe.id}" data-tags='${JSON.stringify(recipe.tags)}'>
      <div class="recipe-card__img-wrap">
        ${imgMarkup}
        <span class="recipe-card__badge ${diffClass}">${recipe.difficulty}</span>
      </div>
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
      ${showDetail ? `
      <div class="recipe-card__footer">
        <button class="btn btn--primary" onclick="alert('Detay sayfası yakında! 🍳')">Detayları Gör</button>
        <button class="btn btn--ghost fav-btn" aria-label="Favorilere ekle" title="Favorilere ekle">♡</button>
      </div>` : ''}
    </article>
  `;
}

/** Tarif gridi'ni render eder */
export function renderRecipeGrid(containerId, recipes, showDetail = true) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = recipes.map(r => createRecipeCard(r, showDetail)).join('');
  initFavoriteButtons(container);
}

/** Favori butonları toggle */
function initFavoriteButtons(container) {
  container.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = btn.classList.toggle('fav-btn--active');
      btn.textContent = isActive ? '♥' : '♡';
      btn.style.color = isActive ? '#C44B1C' : '';
    });
  });
}