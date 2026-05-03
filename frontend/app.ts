/**
 * SmartRec - Etkileşim Mimarı Modülü
 */
declare var Chart: any;

// 1. Veri Yapısı Tanımları
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

// 2. HTML Elemanlarını Yakalama
// --- 1. GİRİŞ (LOGIN) MANTIĞI ---
// Butonu ID ile yakalıyoruz (login.html'de id="loginBtn" olmalı)
const loginBtn = document.getElementById('loginBtn');

if (loginBtn && window.location.pathname.includes('login.html')) {
    loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // HTML'e eklediğin ID'leri tam olarak burada kullanıyoruz
        const emailInput = document.getElementById('email') as HTMLInputElement;
        const passwordInput = document.getElementById('password') as HTMLInputElement;

        // Konsola yazdıralım ki ne gönderdiğimizi görelim (F12'den bakabilirsin)
        console.log("Gönderilen:", emailInput?.value, passwordInput?.value);

        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    password: passwordInput.value.trim()
                })
            });

            const result = await response.json();
            if (result.success) {
                localStorage.setItem('userName', result.user.ad);
                window.location.href = 'dashboard.html';
            } else {
                alert("Hata: " + result.message);
            }
        } catch (err) {
            alert("Sunucuya ulaşılamıyor!");
        }
    });
}

// --- 2. KAYIT (REGISTER) MANTIĞI ---
const registerBtn = document.getElementById('registerBtn');

if (registerBtn && window.location.pathname.includes('register.html')) {
    registerBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const adInput = document.getElementById('regName') as HTMLInputElement;
        const emailInput = document.getElementById('regEmail') as HTMLInputElement;
        const passInput = document.getElementById('regPassword') as HTMLInputElement;
        const confirmInput = document.getElementById('regPasswordConfirm') as HTMLInputElement;

        if (passInput.value !== confirmInput.value) {
            alert("Şifreler eşleşmiyor!");
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ad: adInput.value.trim(),
                    email: emailInput.value.trim(),
                    password: passInput.value.trim()
                })
            });

            const result = await response.json();
            if (result.success) {
                alert("Kayıt başarılı! Giriş sayfasına gidiyorsunuz.");
                window.location.href = 'login.html';
            } else {
                alert("Kayıt Hatası: " + result.message);
            }
        } catch (err) {
            alert("Sunucuya bağlanılamadı!");
        }
    });
}
const notificationsList = document.getElementById('notificationsList');
const inventoryList = document.getElementById('inventoryList');
const addBtn = document.getElementById('addInventoryBtn');
const formDiv = document.getElementById('addInventoryForm');
const saveBtn = document.getElementById('saveInventoryBtn');
const cancelBtn = document.getElementById('cancelInventoryBtn');

const calorieChartCanvas = document.getElementById('calorieChart') as HTMLCanvasElement | null;
const todayCalLabel = document.getElementById('todayCalLabel');
const calorieBar = document.getElementById('calorieBar');
const calorieRemaining = document.getElementById('calorieRemaining');

const inputAd = document.getElementById('newItemName') as HTMLInputElement | null;
const inputSKT = document.getElementById('newItemExpiry') as HTMLInputElement | null;
const inputMiktar = document.getElementById('newItemQty') as HTMLInputElement | null;

// 3. ANA FONKSİYONLAR

/**
 * Envanter Verilerini Çeker ve Arayüzü Günceller
 */
async function verileriGetir(): Promise<void> {
    try {
        const response = await fetch('http://localhost:5000/api/inventory');
        if (!response.ok) throw new Error("Veri çekme işlemi başarısız.");

        const data = await response.json();
        const asilListe = Array.isArray(data) ? data : data.envanter || [];

        // Tabloyu çiz
        envanteriTabloyaBas(asilListe);
        
        // Üstteki sayaçları güncelle
        const countBadge = document.getElementById('inventoryCount');
        if (countBadge) countBadge.innerText = asilListe.length.toString();

        // Malzeme öneri listesini (datalist) güncelle
        malzemeOnerileriniGuncelle(asilListe);

    } catch (error) {
        console.error("Envanter Hatası:", error);
    }
}

/**
 * Kalori Sistemini Backend'den Gelen Verilere Göre Günceller
 */
async function kaloriSisteminiGuncelle(): Promise<void> {
    try {
        const response = await fetch('http://localhost:5000/api/calories');
        const veriler = await response.json();

        const { bugun, hedef, haftalik } = veriler;
        const kalan = hedef - bugun;
        const yuzde = Math.min((bugun / hedef) * 100, 100);

        if (todayCalLabel) todayCalLabel.innerText = `Bugün: ${bugun} kcal`;
        if (calorieRemaining) {
            calorieRemaining.innerText = kalan > 0 ? `${kalan} kcal kaldı` : "Hedefe ulaşıldı!";
        }

        if (calorieBar) {
            calorieBar.style.width = `${yuzde}%`;
            calorieBar.style.backgroundColor = bugun > hedef ? "#e74c3c" : "var(--accent-color)";
        }

        if (calorieChartCanvas) {
            yediGunlukGrafikCiz(haftalik);
        }
    } catch (error) {
        console.warn("Kalori verileri çekilemedi.");
    }
}

/**
 * Bildirimler Panelini Günceller
 */
async function bildirimleriGuncelle(): Promise<void> {
    try {
        const response = await fetch('http://localhost:5000/api/notifications');
        const data = await response.json();

        if (notificationsList && data.success) {
            if (data.bildirimler.length === 0) {
                notificationsList.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">Her şey yolunda! 🎉</p>';
                return;
            }

            notificationsList.innerHTML = data.bildirimler.map((b: any) => `
                <div class="notification-item" style="padding: 12px; margin-bottom: 10px; border-radius: 8px; font-size: 0.85rem; background: ${b.tip === 'danger' ? '#ffeaea' : b.tip === 'warning' ? '#fff4e5' : '#e5f6ff'}; border-left: 5px solid ${b.tip === 'danger' ? '#ff4d4d' : b.tip === 'warning' ? '#ffa500' : '#2196f3'}; color: #333;">
                    ${b.mesaj}
                </div>
            `).join('');
        }
    } catch (error) {
        console.error("Bildirim hatası.");
    }
}

// 4. YARDIMCI FONKSİYONLAR

function envanteriTabloyaBas(liste: Malzeme[]): void {
    if (!inventoryList) return;
    inventoryList.innerHTML = liste.map((item) => {
        const bugun = new Date();
        const sktTarihi = new Date(item.skt);
        const gunFarki = Math.ceil((sktTarihi.getTime() - bugun.getTime()) / (1000 * 3600 * 24));
        let noktaRengi = gunFarki < 0 ? "#e74c3c" : gunFarki <= 3 ? "#f39c12" : "#27ae60";

        return `
            <div class="inventory-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid #eee; background: white; margin-bottom: 5px; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${noktaRengi};"></span>
                    <strong style="color: #333;">${item.ad}</strong>
                </div>
                <div style="display: flex; align-items: center; gap: 15px; color: #666; font-size: 0.85rem;">
                    <span>${item.skt}</span>
                    <span style="font-weight: bold; color: #444;">${item.miktar} Adet</span>
                </div>
            </div>`;
    }).join('');
}

function malzemeOnerileriniGuncelle(envanter: any[]): void {
    const datalist = document.getElementById('material-suggestions') as HTMLDataListElement;
    
    if (datalist) {
        // 1. Envanterdeki tüm isimleri al
        // 2. "Set" kullanarak tekrar edenleri temizle
        // 3. Küçük harf/büyük harf karmaşasını önlemek için isimleri düzenli tut
        const isimler = [...new Set(envanter.map(m => m.ad.trim()))];
        
        // 4. Listeyi temizle ve alfabetik sıralayarak ekle (Arama kolaylığı sağlar)
        datalist.innerHTML = isimler
            .sort((a, b) => a.localeCompare(b)) 
            .map(isim => `<option value="${isim}">`)
            .join('');
    }
}
function yediGunlukGrafikCiz(haftalikVeri: number[]) {
    if (!calorieChartCanvas) return;
    new Chart(calorieChartCanvas, {
        type: 'line',
        data: {
            labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
            datasets: [{
                label: 'Kalori',
                data: haftalikVeri,
                borderColor: '#e67e22',
                backgroundColor: 'rgba(230, 126, 34, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, display: false }, x: { grid: { display: false } } }
        }
    });
}

function formuKapat(): void {
    formDiv?.classList.add('hidden');
    if (inputAd) inputAd.value = "";
    if (inputSKT) inputSKT.value = "";
    if (inputMiktar) inputMiktar.value = "1";
}

// 5. OLAY DİNLEYİCİLER (Event Listeners)

addBtn?.addEventListener('click', () => formDiv?.classList.toggle('hidden'));
cancelBtn?.addEventListener('click', formuKapat);

saveBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!inputAd || !inputSKT || !inputMiktar) return;

    const isim = inputAd.value.trim();
    const skt = inputSKT.value;
    const miktar = Number(inputMiktar.value);

    if (/^\d+$/.test(isim)) {
        alert("⚠️ Malzeme adı sadece sayı olamaz!");
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/inventory/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ad: isim, skt: skt, miktar: miktar })
        });

        if (response.ok) {
            verileriGetir();
            formuKapat();
        }
    } catch (error) { console.error("Kayıt hatası."); }
});

// Enter tuşu ile kutular arası geçiş
[inputAd, inputSKT, inputMiktar].forEach((input, index, array) => {
    input?.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (index < array.length - 1) {
                (array[index + 1] as HTMLElement).focus();
            } else {
                saveBtn?.click();
            }
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // Eğer Dashboard'daysak ve kullanıcı ismi kaydedilmemişse giriş sayfasına at
    if (window.location.pathname.includes('dashboard.html')) {
        const loggedInUser = localStorage.getItem('userName');
        if (!loggedInUser) {
            alert("Lütfen önce giriş yapın!");
            window.location.href = 'login.html';
            return;
        }
        
        // Eğer giriş yapılmışsa ismi ekrana yazdır (HTML'de id="userNameDisplay" varsa)
        const display = document.getElementById('userNameDisplay');
        if (display) display.innerText = `Hoş geldin, ${loggedInUser}`;
    }

    verileriGetir();
    kaloriSisteminiGuncelle();
    bildirimleriGuncelle();
});