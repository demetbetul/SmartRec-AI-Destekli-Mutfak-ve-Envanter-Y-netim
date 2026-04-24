// =============================================
// main.js — Shared interactions across all pages
// =============================================

// ---- Helper: Create a Recipe Card HTML ----
function createRecipeCard(recipe) {
  const tagsHTML = recipe.tags.map((t, i) =>
    `<span class="recipe-tag ${recipe.tagTypes[i] === 'green' ? 'recipe-tag--green' : ''}">${t}</span>`
  ).join('');

  return `
    <article class="recipe-card" data-id="${recipe.id}" data-category="${recipe.category.join(' ')}">
      <div class="recipe-card__img">${recipe.emoji}</div>
      <div class="recipe-card__body">
        <div class="recipe-card__tags">${tagsHTML}</div>
        <h3 class="recipe-card__title">${recipe.title}</h3>
        <p class="recipe-card__desc">${recipe.desc}</p>
      </div>
      <div class="recipe-card__meta">
        <span class="meta-item">🔥 <strong>${recipe.calories}</strong> kcal</span>
        <span class="meta-item">⏱ <strong>${recipe.time}</strong> dk</span>
        <span class="flavor-score">⭐ ${recipe.flavorScore}</span>
      </div>
      <div class="recipe-card__footer">
        <!-- TODO: POST /api/shopping-list/add { recipeId } -->
        <button class="btn btn--ghost add-list-btn" data-id="${recipe.id}">🛒 Listeye Ekle</button>
        <!-- TODO: POST /api/recipes/${recipe.id}/details -->
        <button class="btn btn--primary view-recipe-btn" data-id="${recipe.id}">Tarifi Gör</button>
      </div>
    </article>
  `;
}

// ---- Header scroll effect ----
const header = document.getElementById('header');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// ---- Mobile hamburger ----
const hamburger = document.getElementById('hamburger');
const nav = document.querySelector('.nav');
if (hamburger && nav) {
  hamburger.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

// =============================================
// CHATBOT (Piti)
// =============================================
const chatbotFab   = document.getElementById('chatbotFab');
const chatbotModal = document.getElementById('chatbotModal');
const chatbotClose = document.getElementById('chatbotClose');
const chatbotInput = document.getElementById('chatbotInput');
const chatbotSend  = document.getElementById('chatbotSend');
const chatbotBody  = document.getElementById('chatbotBody');
const openPitiNav  = document.getElementById('openPiti');
const openPitiBanner = document.getElementById('openPitiBanner');

function toggleChatbot(forceOpen) {
  const isOpen = chatbotModal.classList.contains('open');
  if (forceOpen === true || !isOpen) {
    chatbotModal.classList.add('open');
    chatbotModal.setAttribute('aria-hidden', 'false');
    chatbotInput && chatbotInput.focus();
  } else {
    chatbotModal.classList.remove('open');
    chatbotModal.setAttribute('aria-hidden', 'true');
  }
}

function appendChatMsg(text, isUser = false) {
  const div = document.createElement('div');
  div.className = `chat-msg chat-msg--${isUser ? 'user' : 'bot'}`;
  div.innerHTML = `<p>${text}</p>`;
  chatbotBody.appendChild(div);
  chatbotBody.scrollTop = chatbotBody.scrollHeight;
}

function sendChatMessage() {
  const msg = chatbotInput.value.trim();
  if (!msg) return;
  appendChatMsg(msg, true);
  chatbotInput.value = '';
  chatbotInput.disabled = true;

  // TODO: Replace with POST /api/chat { message: msg, userId: currentUser?.id }
  // Simulate AI response
  setTimeout(() => {
    const responses = [
      `"${msg}" için harika bir tarif önerim var! Mercimek çorbası denediniz mi? 🍲`,
      `Anlıyorum! Envanterinize göre ${msg} ile menemen yapabilirsiniz 🍳`,
      `Bu malzemelerle 3 farklı tarif hazırlayabilirim. Hangisini denemek istersiniz?`,
      `Mükemmel seçim! Size adım adım tarifi anlatabilirim 👨‍🍳`,
    ];
    const reply = responses[Math.floor(Math.random() * responses.length)];
    appendChatMsg(reply, false);
    chatbotInput.disabled = false;
    chatbotInput.focus();
  }, 900);
}

if (chatbotFab)    chatbotFab.addEventListener('click', () => toggleChatbot());
if (chatbotClose)  chatbotClose.addEventListener('click', () => toggleChatbot());
if (openPitiNav)   openPitiNav.addEventListener('click', (e) => { e.preventDefault(); toggleChatbot(true); });
if (openPitiBanner) openPitiBanner.addEventListener('click', () => toggleChatbot(true));
if (chatbotSend)   chatbotSend.addEventListener('click', sendChatMessage);
if (chatbotInput) {
  chatbotInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });
}

// =============================================
// HOMEPAGE: Render recipe sections
// =============================================
const dailyCards       = document.getElementById('dailyCards');
const traditionalCards = document.getElementById('traditionalCards');
const healthyCards     = document.getElementById('healthyCards');

if (dailyCards) {
  // TODO: Replace with GET /api/recipes/daily
  const daily = RECIPES.slice(0, 4);
  dailyCards.innerHTML = daily.map(createRecipeCard).join('');
}
if (traditionalCards) {
  // TODO: Replace with GET /api/recipes?category=geleneksel
  const traditional = RECIPES.filter(r => r.category.includes('geleneksel'));
  traditionalCards.innerHTML = traditional.map(createRecipeCard).join('');
}
if (healthyCards) {
  // TODO: Replace with GET /api/recipes?category=saglikli
  const healthy = RECIPES.filter(r => r.category.includes('saglikli'));
  healthyCards.innerHTML = healthy.map(createRecipeCard).join('');
}

// =============================================
// SEARCH BAR
// =============================================
const searchBtn   = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');

function handleSearch() {
  const q = searchInput?.value.trim().toLowerCase();
  if (!q) return;
  // TODO: Replace with GET /api/recipes/search?q={q}
  // For now: filter locally and scroll to results
  const results = RECIPES.filter(r =>
    r.title.toLowerCase().includes(q) ||
    r.desc.toLowerCase().includes(q) ||
    r.category.some(c => c.includes(q))
  );
  if (dailyCards) {
    dailyCards.innerHTML = results.length
      ? results.map(createRecipeCard).join('')
      : `<p style="color:var(--clr-text-muted);grid-column:1/-1">Sonuç bulunamadı: "${q}"</p>`;
    document.getElementById('gunun-menusu')?.scrollIntoView({ behavior: 'smooth' });
  }
}

searchBtn?.addEventListener('click', handleSearch);
searchInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });

// ---- Hero Tag buttons ----
document.querySelectorAll('.tag').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tag').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    if (searchInput) searchInput.value = filter;
    handleSearch();
  });
});

// =============================================
// DELEGATE: Add to list & View recipe buttons
// =============================================
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('add-list-btn')) {
    const id = e.target.dataset.id;
    const recipe = RECIPES.find(r => r.id == id);
    // TODO: POST /api/shopping-list/add { recipeId: id, userId: currentUser?.id }
    if (recipe) showToast(`🛒 "${recipe.title}" alışveriş listesine eklendi!`);
  }
  if (e.target.classList.contains('view-recipe-btn')) {
    const id = e.target.dataset.id;
    const recipe = RECIPES.find(r => r.id == id);
    // TODO: Navigate to /recipe/{id} or open a modal with GET /api/recipes/{id}
    if (recipe) showToast(`📖 ${recipe.title} tarifi açılıyor... (API bağlantısı yapılacak)`);
  }
});

// =============================================
// TOAST NOTIFICATION
// =============================================
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 5.5rem; left: 50%; transform: translateX(-50%);
    background: var(--clr-text); color: #fff; padding: 0.75rem 1.5rem;
    border-radius: 24px; font-size: 0.9rem; font-weight: 500;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 999;
    animation: fadeInUp 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// CSS for toast animation
const styleEl = document.createElement('style');
styleEl.textContent = `@keyframes fadeInUp { from { opacity:0; transform: translateX(-50%) translateY(10px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }`;
document.head.appendChild(styleEl);
