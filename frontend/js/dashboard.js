// =============================================
// dashboard.js — Dashboard logic
// Inventory, SKT system, Chart.js, Shopping,
// Suggestions (Cooked button), Notifications
// =============================================

// =============================================
// INVENTORY
// =============================================
const inventoryList = document.getElementById('inventoryList');

function renderInventory(items) {
  if (!inventoryList) return;
  inventoryList.innerHTML = items.map(item => {
    const sktMap = {
      green:  { dot: 'skt-dot--green',  cls: 'inventory-item--green',  label: item.expiry },
      orange: { dot: 'skt-dot--orange', cls: 'inventory-item--orange', label: `⚠️ ${item.expiry}` },
      red:    { dot: 'skt-dot--red',    cls: 'inventory-item--red',    label: `🚨 ${item.expiry}` },
    };
    const s = sktMap[item.status] || sktMap.green;
    return `
      <div class="inventory-item ${s.cls}" data-id="${item.id}">
        <span class="inventory-item__dot skt-dot ${s.dot}"></span>
        <span class="inventory-item__name">${item.name}</span>
        <span class="inventory-item__expiry">${s.label}</span>
        <span class="inventory-item__qty">${item.qty}</span>
        <!-- TODO: DELETE /api/inventory/{item.id} -->
        <button onclick="removeInventoryItem(${item.id})" style="background:none;border:none;cursor:pointer;color:var(--clr-text-muted);font-size:0.85rem;padding:2px 4px;" title="Sil">✕</button>
      </div>
    `;
  }).join('');
}

// Mock inventory state (in production this comes from API)
let inventoryData = [...INVENTORY];
renderInventory(inventoryData);

// Update stat pills
document.getElementById('inventoryCount').textContent = inventoryData.length;
document.getElementById('expiryCount').textContent =
  inventoryData.filter(i => i.status === 'orange' || i.status === 'red').length;

function removeInventoryItem(id) {
  // TODO: DELETE /api/inventory/{id}
  inventoryData = inventoryData.filter(i => i.id !== id);
  renderInventory(inventoryData);
  document.getElementById('inventoryCount').textContent = inventoryData.length;
  showToast('Malzeme envanterden silindi.');
}

// Add Inventory form toggle
const addInventoryBtn    = document.getElementById('addInventoryBtn');
const addInventoryForm   = document.getElementById('addInventoryForm');
const saveInventoryBtn   = document.getElementById('saveInventoryBtn');
const cancelInventoryBtn = document.getElementById('cancelInventoryBtn');

addInventoryBtn?.addEventListener('click', () => {
  addInventoryForm.classList.toggle('hidden');
});
cancelInventoryBtn?.addEventListener('click', () => {
  addInventoryForm.classList.add('hidden');
});
saveInventoryBtn?.addEventListener('click', () => {
  const name   = document.getElementById('newItemName').value.trim();
  const expiry = document.getElementById('newItemExpiry').value;
  const qty    = document.getElementById('newItemQty').value;
  if (!name) { showToast('Malzeme adı giriniz!'); return; }

  // Determine status from expiry
  let status = 'green';
  if (expiry) {
    const daysLeft = Math.ceil((new Date(expiry) - new Date()) / 86400000);
    if (daysLeft <= 0) status = 'red';
    else if (daysLeft <= 3) status = 'orange';
  }

  const newItem = {
    id: Date.now(),
    name,
    qty: qty ? `${qty} adet` : '1 adet',
    expiry: expiry || 'Belirtilmedi',
    status,
  };
  // TODO: POST /api/inventory { name, qty, expiry, userId }
  inventoryData.push(newItem);
  renderInventory(inventoryData);
  document.getElementById('inventoryCount').textContent = inventoryData.length;
  document.getElementById('newItemName').value = '';
  document.getElementById('newItemExpiry').value = '';
  document.getElementById('newItemQty').value = '';
  addInventoryForm.classList.add('hidden');
  showToast(`✅ "${name}" envantere eklendi!`);
});

// =============================================
// CHART.JS — Weekly Calorie Chart
// =============================================
const calorieCanvas = document.getElementById('calorieChart');
if (calorieCanvas && window.Chart) {
  // TODO: Replace WEEKLY_CALORIES with GET /api/nutrition/weekly?userId={id}
  new Chart(calorieCanvas, {
    type: 'bar',
    data: {
      labels: WEEKLY_CALORIES.labels,
      datasets: [
        {
          label: 'Kalori (kcal)',
          data: WEEKLY_CALORIES.data,
          backgroundColor: WEEKLY_CALORIES.data.map(v =>
            v === 0 ? '#E8DDD0' : v > WEEKLY_CALORIES.goal ? '#C44B1C' : '#4AAF7A'
          ),
          borderRadius: 8,
          borderSkipped: false,
        },
        {
          label: 'Hedef',
          data: Array(7).fill(WEEKLY_CALORIES.goal),
          type: 'line',
          borderColor: '#C44B1C',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} kcal`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 } } },
        y: {
          grid: { color: '#F0EBE0' },
          ticks: { font: { family: 'DM Sans', size: 11 } },
          suggestedMin: 0,
          suggestedMax: 2500,
        }
      }
    }
  });
}

// =============================================
// SHOPPING LIST
// =============================================
const shoppingList = document.getElementById('shoppingList');

function renderShoppingList(items) {
  if (!shoppingList) return;
  shoppingList.innerHTML = items.map(item => `
    <li class="shopping-item ${item.done ? 'checked' : ''}" data-id="${item.id}">
      <!-- TODO: PATCH /api/shopping-list/${item.id} { done: !item.done } -->
      <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleShoppingItem(${item.id}, this)" />
      <span class="shopping-item__name">${item.name}</span>
      <span class="shopping-item__qty">${item.qty}</span>
      <!-- TODO: DELETE /api/shopping-list/${item.id} -->
      <button onclick="removeShoppingItem(${item.id})" style="background:none;border:none;cursor:pointer;color:var(--clr-text-muted);">✕</button>
    </li>
  `).join('');
  document.getElementById('shoppingCount').textContent = items.filter(i => !i.done).length;
}

let shoppingData = [...SHOPPING_LIST];
renderShoppingList(shoppingData);

function toggleShoppingItem(id, el) {
  // TODO: PATCH /api/shopping-list/{id} { done: bool }
  shoppingData = shoppingData.map(i => i.id === id ? { ...i, done: el.checked } : i);
  renderShoppingList(shoppingData);
}
function removeShoppingItem(id) {
  // TODO: DELETE /api/shopping-list/{id}
  shoppingData = shoppingData.filter(i => i.id !== id);
  renderShoppingList(shoppingData);
}

// AI Auto-Generate shopping list
document.getElementById('autoGenBtn')?.addEventListener('click', () => {
  // TODO: POST /api/shopping-list/generate { userId, inventory: inventoryData }
  showToast('✦ Piti alışveriş listesi oluşturuyor...');
  setTimeout(() => {
    const aiItems = [
      { id: Date.now()+1, name: 'Zeytinyağı', qty: '1 L', done: false },
      { id: Date.now()+2, name: 'Domates Salçası', qty: '200 g', done: false },
      { id: Date.now()+3, name: 'Bulgur', qty: '500 g', done: false },
    ];
    shoppingData = [...shoppingData, ...aiItems];
    renderShoppingList(shoppingData);
    showToast('🛒 Piti 3 eksik malzeme ekledi!');
  }, 1200);
});

// Manual add shopping item
document.getElementById('addShoppingItemBtn')?.addEventListener('click', () => {
  const name = prompt('Malzeme adı:');
  if (name?.trim()) {
    const newItem = { id: Date.now(), name: name.trim(), qty: '1 adet', done: false };
    // TODO: POST /api/shopping-list { name, qty, userId }
    shoppingData.push(newItem);
    renderShoppingList(shoppingData);
    showToast(`"${name}" alışveriş listesine eklendi!`);
  }
});

// =============================================
// SUGGESTIONS — "Cooked" button
// =============================================
const suggestionList = document.getElementById('suggestionList');
if (suggestionList) {
  // TODO: POST /api/recipes/suggest { inventory: inventoryData }
  suggestionList.innerHTML = SUGGESTIONS.map(s => `
    <div class="suggestion-item" data-id="${s.id}">
      <span class="suggestion-item__emoji">${s.emoji}</span>
      <div class="suggestion-item__info">
        <div class="suggestion-item__name">${s.name}</div>
        <div class="suggestion-item__meta">⏱ ${s.time} dk &nbsp;|&nbsp; 🔥 ${s.calories} kcal</div>
      </div>
      <!-- TODO: POST /api/cooked { recipeId: ${s.id}, userId } — deducts from inventory -->
      <button class="cooked-btn" data-id="${s.id}" onclick="markCooked(${s.id}, this)">✓ Pişirdim</button>
    </div>
  `).join('');
}

function markCooked(id, btn) {
  // TODO: POST /api/cooked { recipeId: id, userId }
  // This endpoint should: log meal, deduct inventory, update calorie tracking
  btn.classList.toggle('cooked');
  const isCookedNow = btn.classList.contains('cooked');
  btn.textContent = isCookedNow ? '✅ Pişirildi' : '✓ Pişirdim';
  if (isCookedNow) {
    const recipe = SUGGESTIONS.find(s => s.id === id);
    showToast(`🍳 "${recipe?.name}" pişirildi! Envanter güncellendi.`);
    // Mock: update calorie bar
    const bar = document.getElementById('calorieBar');
    if (bar) {
      const newPct = Math.min(100, parseInt(bar.style.width) + 15);
      bar.style.width = newPct + '%';
    }
  }
}

// =============================================
// NOTIFICATIONS
// =============================================
const notifList = document.getElementById('notificationsList');
if (notifList) {
  // TODO: GET /api/notifications?userId={id}
  notifList.innerHTML = NOTIFICATIONS.map(n => `
    <div class="notif-item notif-item--${n.type}">
      <span class="notif-icon">${n.icon}</span>
      <div class="notif-text">
        <strong>${n.title}</strong>
        <span>${n.text}</span>
      </div>
    </div>
  `).join('');
}
