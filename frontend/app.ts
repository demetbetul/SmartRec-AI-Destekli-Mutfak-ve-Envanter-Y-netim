/**
 * SmartRec - Etkileşim Mimarı Modülü
 * Görev: Backend'den verileri çekmek ve arayüzdeki ilgili alanlara yerleştirmek.
 */

// 1. Veri Yapısı Tanımı (Tip Güvenliği)
interface Malzeme {
    id?: number;
    ad: string;
    skt: string;
    miktar: number;
}

// 2. HTML Elemanlarını Yakalama (Tasarımcıdan gelen ID'ler)
const inventoryList = document.getElementById('inventoryList');
const addBtn = document.getElementById('addInventoryBtn');
const formDiv = document.getElementById('addInventoryForm');
const saveBtn = document.getElementById('saveInventoryBtn');
const cancelBtn = document.getElementById('cancelInventoryBtn');

// Input Alanları
const inputAd = document.getElementById('newItemName') as HTMLInputElement | null;
const inputSKT = document.getElementById('newItemExpiry') as HTMLInputElement | null;
const inputMiktar = document.getElementById('newItemQty') as HTMLInputElement | null;

// 3. BACKEND BAĞLANTI FONKSİYONLARI (Ana Görev)

/**
 * Sunucudan (Backend) güncel envanter verilerini çeker.
 */
async function verileriGetir(): Promise<void> {
    try {
        // Backend Yöneticisi'nin hazırladığı API uç noktası
        const response = await fetch('http://localhost:5000/api/inventory');
        
        if (!response.ok) {
            throw new Error("Veri çekme işlemi başarısız oldu.");
        }

        const veriler: Malzeme[] = await response.json();
        
        // Çekilen veriyi tabloya/arayüze bas
        envanteriTabloyaBas(veriler);
        
        // İstatistikleri güncelle (Dashboard üzerindeki sayaç)
        istatistikleriGuncelle(veriler.length);

    } catch (error) {
        console.error("Etkileşim Hatası:", error);
        // Not: Fail-safe (yedek veri) kısmı Veri Yöneticisi'nin sorumluluğundadır.
    }
}

/**
 * Gelen veriyi tasarımcının hazırladığı HTML yapısına göre ekrana basar.
 */
function envanteriTabloyaBas(liste: Malzeme[]): void {
    if (!inventoryList) return;

    inventoryList.innerHTML = liste.map(item => `
        <div class="inventory-item" style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee;">
            <span><strong>${item.ad}</strong></span>
            <span>${item.skt}</span>
            <span>${item.miktar} Adet</span>
        </div>
    `).join('');
}

/**
 * Kullanıcının girdiği yeni malzemeyi Backend'e gönderir.
 */
saveBtn?.addEventListener('click', async () => {
    if (!inputAd || !inputSKT || !inputMiktar) return;

    const yeniMalzeme: Malzeme = {
        ad: inputAd.value,
        skt: inputSKT.value,
        miktar: Number(inputMiktar.value)
    };

    if (yeniMalzeme.ad && yeniMalzeme.skt) {
        try {
            const response = await fetch('http://localhost:5000/api/inventory/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(yeniMalzeme)
            });

            if (response.ok) {
                verileriGetir(); // Listeyi yenile
                formuKapat();
            }
        } catch (error) {
            console.error("Veri gönderme hatası:", error);
        }
    } else {
        alert("Lütfen eksik alanları doldurun.");
    }
});

// 4. ARAYÜZ ETKİLEŞİMLERİ (Yardımcı Fonksiyonlar)

function istatistikleriGuncelle(adet: number): void {
    const countBadge = document.getElementById('inventoryCount');
    if (countBadge) countBadge.innerText = adet.toString();
}

addBtn?.addEventListener('click', () => {
    formDiv?.classList.toggle('hidden');
});

cancelBtn?.addEventListener('click', formuKapat);

function formuKapat(): void {
    formDiv?.classList.add('hidden');
    if (inputAd) inputAd.value = "";
    if (inputSKT) inputSKT.value = "";
    if (inputMiktar) inputMiktar.value = "1";
}

// Sayfa yüklendiğinde bağlantıyı başlat
verileriGetir();