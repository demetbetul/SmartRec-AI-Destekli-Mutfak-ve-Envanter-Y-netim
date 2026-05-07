/**
 * SmartRec — app.ts  (Refaktör v2)
 *
 * Bu dosya TypeScript kaynak kodudur.
 * Derlemek için: tsc app.ts --target ES2020 --module ES2020 --outDir dist
 *
 * Tüm null kontrolleri optional chaining (?.) ve type guard'larla yapılır.
 * Ortak fonksiyonlar Auth modülünde merkezi olarak tutulur.
 */

declare var Chart: any;

// ─── Arayüz Tanımları ──────────────────────────────────────────────────────
interface Kullanici {
  ad: string;
  email?: string;
  name?: string;
}

interface Malzeme {
  id?: number;
  ad: string;
  skt: string;
  miktar: number;
}

interface Ogun {
  id: number;
  ad: string;
  kalori: number;
}

interface KaloriVeri {
  bugun: number;
  hedef: number;
  haftalik: number[];
}

interface Bildirim {
  tip: 'danger' | 'warning' | 'info';
  mesaj: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

// ─── Yardımcı: Element güvenli seçici ─────────────────────────────────────
function getEl<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function getInput(id: string): HTMLInputElement | null {
  return document.getElementById(id) as HTMLInputElement | null;
}

// ─── AUTH MODÜLLERİ ────────────────────────────────────────────────────────
const Auth = {
  getUser(): Kullanici | null {
    try {
      const raw = localStorage.getItem('smartrec_user');
      return raw ? (JSON.parse(raw) as Kullanici) : null;
    } catch {
      return null;
    }
  },

  setUser(user: Kullanici): void {
    localStorage.setItem('smartrec_user', JSON.stringify(user));
    localStorage.setItem('userName', user.ad ?? user.name ?? '');
  },

  logout(): void {
    localStorage.removeItem('smartrec_user');
    localStorage.removeItem('userName');
    window.location.href = 'index.html';
  },

  isLoggedIn(): boolean {
    return !!this.getUser();
  },

  requireAuth(): boolean {
    if (!this.isLoggedIn()) {
      sessionStorage.setItem('redirect_after_login', window.location.href);
      return false;
    }
    return true;
  },
};

// ─── Header UI Güncelle ────────────────────────────────────────────────────
function updateAuthUI(user: Kullanici | null): void {
  const guestActions = getEl('guestActions');
  const userWrapper  = getEl('userMenuWrapper');
  const avatarName   = getEl('avatarDisplayName');
  const dropName     = getEl('dropdownUserName');
  const dropEmail    = getEl('dropdownUserEmail');

  if (user) {
    const displayName = formatName(user.ad ?? user.name ?? 'Kullanıcı');
    guestActions?.classList.add('hidden');
    userWrapper?.classList.remove('hidden');
    if (avatarName) avatarName.textContent = displayName.charAt(0).toUpperCase();
    if (dropName)   dropName.textContent   = displayName;
    if (dropEmail)  dropEmail.textContent  = user.email ?? '';

    // Dashboard hoş geldin satırı
    const welcomeEl = getEl('userNameDisplay');
    if (welcomeEl) welcomeEl.textContent = `Hoş geldin, ${displayName}! Mutfak envanterini yönet.`;

    // Piti karşılama
    const pitiMsg = getEl('pitiWelcomeMsg');
    if (pitiMsg) pitiMsg.innerHTML = `Merhaba <strong>${displayName}</strong>! 👋 Bugün ne pişiriyoruz?`;

  } else {
    guestActions?.classList.remove('hidden');
    userWrapper?.classList.add('hidden');
  }

  // Logout butonları
  document.querySelectorAll<HTMLButtonElement>('.logout-btn').forEach(btn => {
    const clone = btn.cloneNode(true) as HTMLButtonElement;
    btn.replaceWith(clone);
    clone.addEventListener('click', () => Auth.logout());
  });
}

function formatName(name: string): string {
  return name.trim().split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ─── Header Dropdown ───────────────────────────────────────────────────────
function initDropdown(): void {
  const trigger  = getEl('userAvatarBtn');
  const dropdown = getEl('profileDropdown');
  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('active');
    trigger.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('active');
    trigger.setAttribute('aria-expanded', 'false');
  });
  dropdown.addEventListener('click', (e: MouseEvent) => e.stopPropagation());
}

// ─── Hamburger ─────────────────────────────────────────────────────────────
function initHamburger(): void {
  const btn = getEl('hamburger');
  const nav = document.querySelector<HTMLElement>('.nav');
  btn?.addEventListener('click', () => {
    nav?.classList.toggle('open');
    btn.classList.toggle('open');
  });
}

// ─── Scroll Header ─────────────────────────────────────────────────────────
function initScrollHeader(): void {
  const header = getEl('header');
  if (!header) return;
  const handler = () => header.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', handler, { passive: true });
  handler();
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────
function initLogin(): void {
  const form = getEl<HTMLFormElement>('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e: SubmitEvent) => {
    e.preventDefault();
    const email = getInput('email');
    const pass  = getInput('password');
    if (!email || !pass) return;

    const btn = getEl<HTMLButtonElement>('loginBtn');
    if (btn) { btn.textContent = 'Giriş yapılıyor...'; btn.disabled = true; }

    try {
      const res  = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.value.trim(), password: pass.value.trim() }),
      });
      const data = await res.json() as ApiResponse<{ user: Kullanici }>;

      if (data.success && data.data?.user) {
        Auth.setUser(data.data.user);
        const redirect = sessionStorage.getItem('redirect_after_login') ?? 'dashboard.html';
        sessionStorage.removeItem('redirect_after_login');
        window.location.href = redirect;
      } else {
        showApiError('loginApiError', data.message ?? 'Hata oluştu.');
      }
    } catch {
      showApiError('loginApiError', '⚠️ Sunucuya ulaşılamıyor.');
    } finally {
      if (btn) { btn.textContent = 'Giriş Yap'; btn.disabled = false; }
    }
  });
}

// ─── KAYIT ─────────────────────────────────────────────────────────────────
function initRegister(): void {
  const form = getEl<HTMLFormElement>('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e: SubmitEvent) => {
    e.preventDefault();
    const name    = getInput('regName');
    const email   = getInput('regEmail');
    const pass    = getInput('regPassword');
    const confirm = getInput('regPasswordConfirm');
    if (!name || !email || !pass || !confirm) return;

    if (pass.value !== confirm.value) {
      markInputError('regPasswordConfirm', 'regConfirmError', true);
      return;
    }

    const btn = getEl<HTMLButtonElement>('registerBtn');
    if (btn) { btn.textContent = 'Kayıt yapılıyor...'; btn.disabled = true; }

    try {
      const res  = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad: name.value.trim(), email: email.value.trim(), password: pass.value.trim() }),
      });
      const data = await res.json() as ApiResponse;

      if (data.success) {
        Auth.setUser({ ad: name.value.trim(), email: email.value.trim() });
        window.location.href = 'dashboard.html';
      } else {
        showApiError('registerApiError', data.message ?? 'Kayıt sırasında hata oluştu.');
      }
    } catch {
      showApiError('registerApiError', '⚠️ Sunucuya ulaşılamıyor.');
    } finally {
      if (btn) { btn.textContent = 'Kayıt Ol'; btn.disabled = false; }
    }
  });
}

// ─── Envanter ──────────────────────────────────────────────────────────────
const inventoryList = getEl('inventoryList');
const addBtn        = getEl<HTMLButtonElement>('addInventoryBtn');
const formDiv       = getEl('addInventoryForm');
const saveBtn       = getEl<HTMLButtonElement>('saveInventoryBtn');
const cancelBtn     = getEl<HTMLButtonElement>('cancelInventoryBtn');
const inputAd       = getInput('newItemName');
const inputSKT      = getInput('newItemExpiry');
const inputMiktar   = getInput('newItemQty');

async function verileriGetir(): Promise<void> {
  try {
    const res = await fetch('http://localhost:5000/api/inventory');
    if (!res.ok) throw new Error();
    const data = await res.json();
    const liste: Malzeme[] = Array.isArray(data) ? data : data.envanter ?? [];
    
    // Tabloyu çiz
    envanteriCiz(liste);
    
    const countBadge = getEl('inventoryCount');
    if (countBadge) countBadge.textContent = liste.length.toString();
    malzemeOnerileriniGuncelle(liste);
  } catch (err) {
    console.warn('Envanter çekilemedi:', err);
  }
}

function envanteriCiz(liste: Malzeme[]): void {
    if (!inventoryList) return;
    const today = new Date();
    
    inventoryList.innerHTML = liste.map((item) => {
        const sktDate = new Date(item.skt);
        const diff = Math.ceil((sktDate.getTime() - today.getTime()) / 86_400_000);
        
        // Senin orijinal tasarımındaki arka plan renkleri:
        const cls = diff < 0 ? 'inventory-item--red' : diff <= 3 ? 'inventory-item--orange' : 'inventory-item--green';
        const color = diff < 0 ? '#C0392B' : diff <= 3 ? '#D4720A' : '#2D7A4F';

        return `
            <div class="inventory-item ${cls}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; margin-bottom: 5px; border-radius: 8px; border: 1px solid #eee;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="inventory-item__dot" style="background:${color}; width: 10px; height: 10px; border-radius: 50%; display: inline-block;"></span>
                    <strong class="inventory-item__name" style="color: #333;">${item.ad}</strong>
                </div>
                <div style="display: flex; align-items: center; gap: 15px; color: #666; font-size: 0.85rem;">
                    <span class="inventory-item__expiry">${item.skt}</span>
                    <span class="inventory-item__qty" style="font-weight: bold; color: #444;">${item.miktar} adet</span>
                    
                    <div style="display: flex; gap: 5px; margin-left: 10px;">
                        <button class="qty-btn minus-btn" data-id="${item.ad}" style="background: #f1f2f6; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: bold; color: #e74c3c;">-</button>
                        <button class="qty-btn plus-btn" data-id="${item.ad}" style="background: #f1f2f6; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: bold; color: #27ae60;">+</button>
                        <button class="delete-item-btn" data-id="${item.ad}" style="background: #ffeaea; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; color: #e74c3c;" title="Sil">🗑️</button>
                    </div>
                </div>
            </div>`;
    }).join('');

    // --- BUTON TETİKLEYİCİLERİ ---
    const islemYap = async (url: string, method: string = 'POST') => {
        try {
            const response = await fetch(url, { method });
            if (response.ok) verileriGetir(); 
        } catch (err) { console.error("Sunucuya ulaşılamıyor."); }
    };

    document.querySelectorAll('.minus-btn').forEach(btn => {
        btn.addEventListener('click', (e) => islemYap(`http://localhost:5000/api/inventory/qty/${(e.currentTarget as HTMLElement).getAttribute('data-id')}?degisim=-1`));
    });

    document.querySelectorAll('.plus-btn').forEach(btn => {
        btn.addEventListener('click', (e) => islemYap(`http://localhost:5000/api/inventory/qty/${(e.currentTarget as HTMLElement).getAttribute('data-id')}?degisim=1`));
    });

    document.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            if(confirm(`"${id}" çöpe atılacak. Emin misiniz?`)) {
                islemYap(`http://localhost:5000/api/inventory/remove/${id}`, 'DELETE');
            }
        });
    });
}

function malzemeOnerileriniGuncelle(envanter: Malzeme[]): void {
  const datalist = document.getElementById('material-suggestions') as HTMLDataListElement | null;
  if (!datalist) return;
  const isimler = [...new Set(envanter.map(m => m.ad.trim()))].sort((a, b) => a.localeCompare(b, 'tr'));
  datalist.innerHTML = isimler.map(isim => `<option value="${isim}">`).join('');
}

function formuKapat(): void {
  formDiv?.classList.add('hidden');
  if (inputAd)     inputAd.value     = '';
  if (inputSKT)    inputSKT.value    = '';
  if (inputMiktar) inputMiktar.value = '1';
}

addBtn?.addEventListener('click', () => formDiv?.classList.toggle('hidden'));
cancelBtn?.addEventListener('click', formuKapat);

saveBtn?.addEventListener('click', async (e: MouseEvent) => {
  e.preventDefault();
  const isim   = inputAd?.value.trim() ?? '';
  const skt    = inputSKT?.value ?? '';
  const miktar = Number(inputMiktar?.value) || 1;
  if (!isim) { inputAd?.focus(); return; }
  if (/^\d+$/.test(isim)) { alert('⚠️ Malzeme adı sadece sayı olamaz!'); return; }
  try {
    const res = await fetch('http://localhost:5000/api/inventory/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad: isim, skt, miktar }),
    });
    if (res.ok) { await verileriGetir(); formuKapat(); }
  } catch { console.error('Kayıt hatası'); }
});

[inputAd, inputSKT, inputMiktar].forEach((input, i, arr) => {
  input?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    i < arr.length - 1 ? (arr[i + 1] as HTMLElement | null)?.focus() : saveBtn?.click();
  });
});

// ─── Kalori ────────────────────────────────────────────────────────────────
const calorieCanvas   = getEl<HTMLCanvasElement>('calorieChart');
const todayCalLabel   = getEl('todayCalLabel');
const calorieBar      = getEl('calorieBar');
const calorieRemaining = getEl('calorieRemaining');

async function kaloriSisteminiGuncelle(): Promise<void> {
  try {
    const res  = await fetch('http://localhost:5000/api/calories');
    const data = await res.json() as KaloriVeri;
    renderKalori(data.bugun, data.hedef, data.haftalik);
  } catch {
    console.warn('Kalori verileri çekilemedi.');
  }
}

function renderKalori(bugun: number, hedef: number, haftalik: number[]): void {
  const kalan = hedef - bugun;
  const yuzde = Math.min((bugun / hedef) * 100, 100);
  if (todayCalLabel)   todayCalLabel.textContent   = `Bugün: ${bugun} kcal`;
  if (calorieRemaining) calorieRemaining.textContent = kalan > 0 ? `${kalan} kcal kaldı` : '🎯 Hedefe ulaşıldı!';
  if (calorieBar) {
    (calorieBar as HTMLElement).style.width = `${yuzde}%`;
    (calorieBar as HTMLElement).style.background =
      bugun > hedef ? 'linear-gradient(90deg,#e74c3c,#c0392b)' : 'linear-gradient(90deg,#2D7A4F,#4AAF7A)';
  }
  if (calorieCanvas && typeof Chart !== 'undefined') {
    new Chart(calorieCanvas, {
      type: 'line',
      data: {
        labels: ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'],
        datasets: [{ label: 'Kalori', data: haftalik, borderColor: '#C44B1C', backgroundColor: 'rgba(196,75,28,0.08)', fill: true, tension: 0.4 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, display: false }, x: { grid: { display: false } } } },
    });
  }
}

// ─── Bildirimler ───────────────────────────────────────────────────────────
const notificationsList = getEl('notificationsList');

async function bildirimleriGuncelle(): Promise<void> {
  try {
    const res  = await fetch('http://localhost:5000/api/notifications');
    const data = await res.json() as { success: boolean; bildirimler: Bildirim[] };
    if (notificationsList && data.success) {
      notificationsList.innerHTML = data.bildirimler.length === 0
        ? '<p style="color:#888;text-align:center;padding:20px">Her şey yolunda! 🎉</p>'
        : data.bildirimler.map(b => {
            const bg     = b.tip === 'danger' ? '#ffeaea' : b.tip === 'warning' ? '#fff4e5' : '#e5f6ff';
            const border = b.tip === 'danger' ? '#ff4d4d' : b.tip === 'warning' ? '#ffa500' : '#2196f3';
            return `<div class="notification-item" style="padding:12px;margin-bottom:10px;border-radius:8px;font-size:0.85rem;background:${bg};border-left:5px solid ${border};color:#333">${b.mesaj}</div>`;
          }).join('');
    }
  } catch { console.warn('Bildirim hatası.'); }
}

// ─── Piti Chatbot ──────────────────────────────────────────────────────────
function initPiti(): void {
  const modal    = getEl('chatbotModal');
  const fab      = getEl('chatbotFab');
  const navBtn   = getEl('openPiti');
  const closeBtn = getEl('chatbotClose');
  const input    = getInput('chatbotInput');
  const sendBtn  = getEl<HTMLButtonElement>('chatbotSend');
  const body     = getEl('chatbotBody');
  if (!modal || !fab) return;

  const toggle = (e?: Event): void => {
    e?.preventDefault();
    modal.classList.toggle('open');
    modal.setAttribute('aria-hidden', String(!modal.classList.contains('open')));
    if (modal.classList.contains('open')) input?.focus();
  };

  const sendMessage = async (): Promise<void> => {
    const text = input?.value.trim();
    if (!text || !body) return;

    appendChatMsg(body, text, 'user');
    if (input) input.value = '';
    body.scrollTop = body.scrollHeight;

    const loadingId = `loading-${Date.now()}`;
    appendChatMsg(body, 'Piti düşünüyor... 💭', 'bot', loadingId);
    body.scrollTop = body.scrollHeight;

    try {
      const res  = await fetch('http://localhost:5000/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesaj: text }),
      });
      const data = await res.json() as { cevap?: string };
      const loadEl = getEl(loadingId);
      if (loadEl) loadEl.querySelector('p')!.textContent = data.cevap ?? 'Cevap alınamadı.';
    } catch {
      const loadEl = getEl(loadingId);
      if (loadEl) loadEl.querySelector('p')!.innerHTML = '<span style="color:#C0392B">⚠️ Sunucuya ulaşılamıyor.</span>';
    }
    body.scrollTop = body.scrollHeight;
  };

  fab.addEventListener('click', toggle);
  navBtn?.addEventListener('click', toggle);
  closeBtn?.addEventListener('click', toggle);
  sendBtn?.addEventListener('click', sendMessage);
  input?.addEventListener('keypress', (e: KeyboardEvent) => { if (e.key === 'Enter') sendMessage(); });
}

function appendChatMsg(container: HTMLElement, text: string, type: 'user' | 'bot', id = ''): void {
  const div = document.createElement('div');
  div.className = `chat-msg chat-msg--${type}`;
  if (id) div.id = id;
  div.innerHTML = `<p>${text}</p>`;
  container.appendChild(div);
}

// ─── Form Yardımcıları ─────────────────────────────────────────────────────
function markInputError(inputId: string, errorId: string, show: boolean): void {
  getEl(inputId)?.classList.toggle('error', show);
  const errEl = getEl(errorId);
  if (errEl) errEl.classList.toggle('show', show);
}

function showApiError(id: string, msg: string): void {
  const el = getEl(id);
  if (el) { el.textContent = msg; el.classList.add('show'); }
}

// ─── DOMContentLoaded ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Auth UI
  updateAuthUI(Auth.getUser());
  initScrollHeader();
  initHamburger();
  initDropdown();
  initPiti();

  // Sayfa spesifik init
  const path = window.location.pathname;

  if (path.includes('login.html')) {
    if (Auth.isLoggedIn()) { window.location.replace('dashboard.html'); return; }
    initLogin();
    initRegister();
  }

  if (path.includes('dashboard.html')) {
    if (!Auth.requireAuth()) {
      // Auth guard devreye girdi — içerik yüklenmesin
      return;
    }
    const user = Auth.getUser();
    const name = formatName(user?.ad ?? user?.name ?? 'Kullanıcı');
    const welcomeEl = getEl('userNameDisplay');
    if (welcomeEl) welcomeEl.textContent = `Hoş geldin, ${name}! Mutfak envanterini yönet.`;
    verileriGetir();
    kaloriSisteminiGuncelle();
    bildirimleriGuncelle();
  }
});

// ==========================================
// --- ALIŞVERİŞ LİSTESİ MİMARİSİ (AI + MANUEL) ---
// ==========================================
setTimeout(() => {
    const autoGenBtn = document.getElementById('autoGenBtn');
    const manualAddBtn = document.getElementById('addShoppingItemBtn');
    const listUI = document.getElementById('shoppingList');

    const listeyeEkle = (metin: string) => {
        if (!listUI || !metin.trim()) return;

        const li = document.createElement('li');
        li.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: #fff; border-radius: 8px; border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: all 0.3s ease;";
        
        li.innerHTML = `
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1;">
                <input type="checkbox" style="accent-color: #e67e22; width: 18px; height: 18px; cursor: pointer;">
                <span class="item-text" style="color: #444; font-weight: 500;">${metin}</span>
            </label>
            <button class="delete-btn" style="background: #ffeaea; color: #e74c3c; border: none; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; transition: 0.2s;">&times;</button>
        `;

        const deleteBtn = li.querySelector('.delete-btn') as HTMLButtonElement;
        deleteBtn.addEventListener('click', () => {
            li.style.opacity = '0';
            li.style.transform = 'translateX(-20px)';
            setTimeout(() => li.remove(), 300);
        });
        
        deleteBtn.onmouseover = () => deleteBtn.style.background = '#ffc0c0';
        deleteBtn.onmouseout = () => deleteBtn.style.background = '#ffeaea';

        const checkbox = li.querySelector('input');
        const span = li.querySelector('.item-text') as HTMLElement;
        checkbox?.addEventListener('change', (e: any) => {
            span.style.textDecoration = e.target.checked ? 'line-through' : 'none';
            span.style.color = e.target.checked ? '#aaa' : '#444';
        });

        listUI.prepend(li);
    };

    if (manualAddBtn) {
        manualAddBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (document.getElementById('manualInputContainer')) return;

            const container = document.createElement('div');
            container.id = 'manualInputContainer';
            container.style.cssText = "display: flex; gap: 8px; margin-top: 15px; animation: fadeIn 0.3s;";
            
            container.innerHTML = `
                <input type="text" id="manualItemInput" placeholder="Örn: 1 kg Elma..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px; outline: none; font-family: inherit;">
                <button id="confirmManualAdd" style="background: #e67e22; color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: bold;">Ekle</button>
                <button id="cancelManualAdd" style="background: #f1f2f6; color: #666; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer;">İptal</button>
            `;
            
            manualAddBtn.parentElement?.appendChild(container);
            
            const input = document.getElementById('manualItemInput') as HTMLInputElement;
            const confirmBtn = document.getElementById('confirmManualAdd');
            const cancelBtn = document.getElementById('cancelManualAdd');
            
            input.focus();
            
            const kaydet = () => {
                if (input.value.trim()) {
                    listeyeEkle(input.value.trim());
                    input.value = ""; 
                    input.focus();
                }
            };
            
            confirmBtn?.addEventListener('click', kaydet);
            input?.addEventListener('keypress', (e) => { if (e.key === 'Enter') kaydet(); });
            cancelBtn?.addEventListener('click', () => container.remove());
        });
    }

    if (autoGenBtn) {
        autoGenBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const orjinalMetin = autoGenBtn.innerHTML;
            autoGenBtn.innerHTML = `⏳ Hazırlanıyor...`;
            autoGenBtn.style.pointerEvents = 'none';

            try {
                const response = await fetch('http://localhost:5000/api/shopping-list/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kullanici: localStorage.getItem('userName') || 'Kullanıcı' })
                });

                const data = await response.json();
                if (data.success && data.liste) {
                    data.liste.forEach((madde: string) => listeyeEkle(madde));
                }
            } catch (error) {
                alert("Backend'e ulaşılamıyor.");
            } finally {
                autoGenBtn.innerHTML = orjinalMetin;
                autoGenBtn.style.pointerEvents = 'auto';
            }
        });
    }
}, 500);

// ==========================================
// --- AKILLI TEMİZLİK SİSTEMİ ---
// ==========================================
setTimeout(() => {
    const headerDiv = document.querySelector('.dash-card--inventory .dash-card__header');
    if (headerDiv && !document.getElementById('smartCleanBtn')) {
        const cleanBtn = document.createElement('button');
        cleanBtn.id = 'smartCleanBtn';
        cleanBtn.className = 'btn btn--ghost btn--sm';
        cleanBtn.innerHTML = '🪄 Akıllı Temizlik';
        cleanBtn.style.marginLeft = '10px';
        headerDiv.appendChild(cleanBtn);

        cleanBtn.addEventListener('click', async () => {
            cleanBtn.innerHTML = '⏳ Temizleniyor...';
            try {
                const res = await fetch('http://localhost:5000/api/inventory/smart-clean', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    if (data.silinenler.length > 0) {
                        alert(`🧹 Temizlik tamamlandı!\nÇöpe atılan bozuk ürünler: ${data.silinenler.join(', ')}`);
                    } else {
                        alert('✨ Harika! Dolapta tarihi geçmiş hiçbir ürün yok.');
                    }
                    verileriGetir(); // Tabloyu yeniler
                }
            } catch(e) {
                alert('Backend\'e ulaşılamadı!');
            } finally {
                cleanBtn.innerHTML = '🪄 Akıllı Temizlik';
            }
        });
    }
}, 600);