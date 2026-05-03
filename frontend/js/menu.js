// =============================================
// menu.js — Menu page filter & sort logic
// TODO: Replace mock data with API calls
// =============================================

const menuCards   = document.getElementById('menuCards');
const filterBtns  = document.querySelectorAll('.filter-btn');
const sortSelect  = document.getElementById('sortSelect');
const resultsInfo = document.getElementById('resultsInfo');
const loadMoreBtn = document.getElementById('loadMoreBtn');

let currentFilter = 'all';
let currentSort   = 'popular';
let page = 1;

// Check URL params for pre-selected category
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('cat')) {
  currentFilter = urlParams.get('cat');
}

function getSortedFiltered() {
  // TODO: Replace with GET /api/recipes?category={filter}&sort={sort}&page={page}
  let results = currentFilter === 'all'
    ? [...RECIPES]
    : RECIPES.filter(r => r.category.includes(currentFilter));

  switch (currentSort) {
    case 'calories-asc': results.sort((a, b) => a.calories - b.calories); break;
    case 'time-asc':     results.sort((a, b) => a.time - b.time); break;
    case 'newest':       results.sort((a, b) => b.id - a.id); break;
    default:             results.sort((a, b) => b.flavorScore - a.flavorScore);
  }
  return results;
}

function renderMenuCards() {
  if (!menuCards) return;
  const results = getSortedFiltered();
  menuCards.innerHTML = results.length
    ? results.map(createRecipeCard).join('')
    : `<p style="color:var(--clr-text-muted);grid-column:1/-1;padding:2rem 0">Bu kategoride tarif bulunamadı.</p>`;

  if (resultsInfo) {
    const label = currentFilter === 'all' ? 'Tüm tarifler' : `"${currentFilter}" tarifler`;
    resultsInfo.textContent = `${label} gösteriliyor — ${results.length} sonuç`;
  }
}

// Sync active filter button
function syncFilterBtns() {
  filterBtns.forEach(btn => {
    btn.classList.toggle('filter-btn--active', btn.dataset.filter === currentFilter);
  });
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    syncFilterBtns();
    renderMenuCards();
  });
});

sortSelect?.addEventListener('change', () => {
  currentSort = sortSelect.value;
  renderMenuCards();
});

// Load More (mock — just reshuffles for demo)
loadMoreBtn?.addEventListener('click', () => {
  page++;
  // TODO: Fetch next page from GET /api/recipes?page={page}
  showToast(`Sayfa ${page} yükleniyor... (API bağlantısı yapılacak)`);
});

// Init
syncFilterBtns();
renderMenuCards();
