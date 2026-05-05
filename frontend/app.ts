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
// ==========================================
// --- PITI AI VE DİNAMİK KULLANICI SİSTEMİ ---
// ==========================================
(function() {
    console.log("Piti Sistemi Başlatılıyor... 🤖");

    // 1. İSİM GÜNCELLEME FONKSİYONU
    const guncelleIsim = () => {
        let aktifKullanici = localStorage.getItem('userName') || 'Kullanıcı';
        if (aktifKullanici !== 'Kullanıcı') {
            aktifKullanici = aktifKullanici.split(' ').map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' ');
        }
        
        const userBadge = document.querySelector('.user-badge'); 
        if (userBadge) {
            userBadge.innerHTML = `👤 Hoş geldin, ${aktifKullanici}`;
        }

        const pitiMsg = document.getElementById('pitiWelcomeMsg');
        if (pitiMsg) {
            pitiMsg.innerHTML = `Merhaba ${aktifKullanici}! 👋 Bugün ne pişiriyoruz?`;
        }
    };

    // 2. PITI ASİSTAN FONKSİYONU VE API BAĞLANTISI
    const initPiti = () => {
        const modal = document.getElementById('chatbotModal');
        const fab = document.getElementById('chatbotFab');
        const navBtn = document.getElementById('openPiti');
        const closeBtn = document.getElementById('chatbotClose');
        
        const input = document.getElementById('chatbotInput') as HTMLInputElement;
        const sendBtn = document.getElementById('chatbotSend');
        const body = document.getElementById('chatbotBody');

        if (!modal || !fab) return;

        // Kutu açma/kapama animasyonu
        const gosterGizle = (e?: any) => {
            if (e) e.preventDefault();
            console.log("Asistan butonu tetiklendi! 🚀");
            modal.style.display = 'flex';
            modal.classList.toggle('open');
        };

        // Kurye (Fetch API) ile Backend'e Mesaj Gönderme
        const mesajGonder = async () => {
            const text = input?.value.trim();
            if (!text || !body) return;

            // Kullanıcının mesajını ekrana bas
            body.innerHTML += `<div class="chat-msg chat-msg--user" style="margin-top: 10px; align-self: flex-end;"><p>${text}</p></div>`;
            input.value = "";
            body.scrollTop = body.scrollHeight;

            // "Düşünüyor..." animasyonu
            const loadingId = "loading-" + Date.now();
            body.innerHTML += `<div id="${loadingId}" class="chat-msg chat-msg--bot" style="margin-top: 10px; align-self: flex-start;"><p>Piti düşünüyor... 💭</p></div>`;
            body.scrollTop = body.scrollHeight;

            // Backend API'sine bağlanma
            try {
                const response = await fetch('http://localhost:5000/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mesaj: text })
                });

                const data = await response.json();
                
                // Gerçek cevabı ekrana yazdır
                const loadingElement = document.getElementById(loadingId);
                if (loadingElement) {
                    loadingElement.innerHTML = `<p>${data.cevap || "Bağlantı kuruldu ama cevap boş döndü."}</p>`;
                }

            } catch (error) {
                const loadingElement = document.getElementById(loadingId);
                if (loadingElement) {
                    loadingElement.innerHTML = `<p style="color: #C0392B; font-weight: bold;">Sunucuya ulaşılamıyor. Arkadaşın backend'i çalıştırdı mı? 😅</p>`;
                }
            }
            body.scrollTop = body.scrollHeight;
        };

        // Buton Dinleyicileri
        fab.onclick = gosterGizle;
        if (navBtn) navBtn.onclick = gosterGizle;
        if (closeBtn) closeBtn.onclick = gosterGizle;
        if (sendBtn) sendBtn.onclick = mesajGonder;
        
        if (input) {
            input.onkeypress = (e) => {
                if (e.key === 'Enter') mesajGonder();
            };
        }
    };

    // 3. ÇALIŞTIRICI
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initPiti();
            guncelleIsim();
        });
    } else {
        initPiti();
        guncelleIsim();
    }
})();

const ismiDinamikYap = () => {
    // Kullanıcının adını hafızadan al, yoksa 'Kullanıcı' de
    let aktifKullanici = localStorage.getItem('userName') || localStorage.getItem('kullaniciAdi') || 'Kullanıcı';
    
    // Baş harfi büyütme (örn: ahmet -> Ahmet)
    if (aktifKullanici !== 'Kullanıcı') {
        aktifKullanici = aktifKullanici.split(' ').map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' ');
    }
    
    // 1. Üst menüdeki Ali'yi yok et
    const userBadge = document.querySelector('.user-badge'); 
    if (userBadge) {
        userBadge.innerHTML = `👤 Hoş geldin, ${aktifKullanici}`;
    }

    // 2. Piti'nin karşılama mesajındaki Ali'yi yok et
    const pitiMsg = document.querySelector('#chatbotBody .chat-msg--bot p');
    if (pitiMsg && pitiMsg.innerHTML.includes('Ali')) {
        pitiMsg.innerHTML = `Merhaba ${aktifKullanici}! 👋 Envanterinize baktım — bugün <strong>domates ve yumurta</strong> ile menemen yapabilirsiniz 🍳`;
    }
};

// Sayfa yüklendikten hemen sonra bu temizliği yap
setTimeout(ismiDinamikYap, 200);
// ==========================================
// ==========================================
// --- ALIŞVERİŞ LİSTESİ MİMARİSİ (AI + MANUEL) ---
// ==========================================
// ==========================================
// --- ALIŞVERİŞ LİSTESİ MİMARİSİ (AI + MANUEL) ---
// ==========================================
setTimeout(() => {
    // HTML'indeki GERÇEK ID'leri yakalıyoruz
    const autoGenBtn = document.getElementById('autoGenBtn');
    const manualAddBtn = document.getElementById('addShoppingItemBtn'); // DEĞİŞTİRDİK!
    const listUI = document.getElementById('shoppingList'); // DEĞİŞTİRDİK!

    // ... kodun geri kalanı tamamen aynı kalacak ...

    // --- ORTAK FONKSİYON: Şık Liste Elemanı Üretici ---
    const listeyeEkle = (metin: string) => {
        if (!listUI || !metin.trim()) return;

        const li = document.createElement('li');
        // Kutu tasarımı: Beyaz arka plan, gölge, yuvarlak köşeler
        li.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: #fff; border-radius: 8px; border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: all 0.3s ease;";
        
        li.innerHTML = `
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1;">
                <input type="checkbox" style="accent-color: #e67e22; width: 18px; height: 18px; cursor: pointer;">
                <span class="item-text" style="color: #444; font-weight: 500;">${metin}</span>
            </label>
            <button class="delete-btn" style="background: #ffeaea; color: #e74c3c; border: none; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; transition: 0.2s;">&times;</button>
        `;

        // Aksiyon 1: Çarpıya basınca silme animasyonu
        const deleteBtn = li.querySelector('.delete-btn') as HTMLButtonElement;
        deleteBtn.addEventListener('click', () => {
            li.style.opacity = '0';
            li.style.transform = 'translateX(-20px)';
            setTimeout(() => li.remove(), 300);
        });
        
        // Hover (Üstüne gelme) efektleri
        deleteBtn.onmouseover = () => deleteBtn.style.background = '#ffc0c0';
        deleteBtn.onmouseout = () => deleteBtn.style.background = '#ffeaea';

        // Aksiyon 2: Checkbox'a basınca üstünü çizme efekti
        const checkbox = li.querySelector('input');
        const span = li.querySelector('.item-text') as HTMLElement;
        checkbox?.addEventListener('change', (e: any) => {
            span.style.textDecoration = e.target.checked ? 'line-through' : 'none';
            span.style.color = e.target.checked ? '#aaa' : '#444';
        });

        // Listeye ekle (En yeni eklenen en üste gelsin)
        listUI.prepend(li);
    };

    // --- MANUEL EKLE BUTONU MANTIĞI ---
    if (manualAddBtn) {
        manualAddBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Eğer yazı kutusu zaten açıksa bir daha açma
            if (document.getElementById('manualInputContainer')) return;

            // Butonun altına dinamik bir form kutusu yaratıyoruz
            const container = document.createElement('div');
            container.id = 'manualInputContainer';
            container.style.cssText = "display: flex; gap: 8px; margin-top: 15px; animation: fadeIn 0.3s;";
            
            container.innerHTML = `
                <input type="text" id="manualItemInput" placeholder="Örn: 1 kg Elma..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px; outline: none; font-family: inherit;">
                <button id="confirmManualAdd" style="background: #e67e22; color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: bold;">Ekle</button>
                <button id="cancelManualAdd" style="background: #f1f2f6; color: #666; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer;">İptal</button>
            `;
            
            // Kutuyu "Manuel Ekle" butonunun parent elementinin (içinde bulunduğu div'in) sonuna ekle
            manualAddBtn.parentElement?.appendChild(container);
            
            const input = document.getElementById('manualItemInput') as HTMLInputElement;
            const confirmBtn = document.getElementById('confirmManualAdd');
            const cancelBtn = document.getElementById('cancelManualAdd');
            
            input.focus(); // İmleci otomatik olarak yazı kutusuna oturt
            
            // Ekleme işlemini yapan asıl fonksiyon
            const kaydet = () => {
                if (input.value.trim()) {
                    listeyeEkle(input.value.trim());
                    input.value = ""; // Ekledikten sonra kutuyu temizle ki yeni bir şey yazılabilsin
                    input.focus();
                }
            };
            
            confirmBtn?.addEventListener('click', kaydet);
            // Klavyeden Enter'a basınca da eklesin
            input?.addEventListener('keypress', (e) => { if (e.key === 'Enter') kaydet(); });
            
            // İptal butonuna basınca kutuyu tamamen yok et
            cancelBtn?.addEventListener('click', () => container.remove());
        });
    }

    // --- AI İLE OLUŞTUR BUTONU MANTIĞI ---
    if (autoGenBtn) {
        autoGenBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const orjinalMetin = autoGenBtn.innerHTML;
            autoGenBtn.innerHTML = `⏳ Hazırlanıyor...`;
            autoGenBtn.style.pointerEvents = 'none';

            try {
                // Arkadaşının Python kapısına kurye yolluyoruz
                const response = await fetch('http://localhost:5000/api/shopping-list/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kullanici: localStorage.getItem('userName') || 'Kullanıcı' })
                });

                const data = await response.json();

                if (data.success && data.liste) {
                    // Alert yerine listeyeEkle fonksiyonuna yolluyoruz
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