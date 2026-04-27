// 1. Veri Yapısı (Interface) - Ödevin Tip Güvenliği Kuralı
interface Malzeme {
    id?: number;
    ad: string;
    skt: string;
    miktar: number;
}

// 2. HTML Elemanlarını Yakalama
const inventoryTable = document.querySelector('.inventory-table tbody') as HTMLTableSectionElement;
const addBtn = document.getElementById('addInventoryBtn') as HTMLButtonElement;
const formDiv = document.getElementById('addInventoryForm') as HTMLDivElement;
const saveBtn = document.getElementById('saveInventoryBtn') as HTMLButtonElement;

// Form Inputları
const inputAd = document.getElementById('newItemName') as HTMLInputElement;
const inputSKT = document.getElementById('newItemExpiry') as HTMLInputElement;
const inputMiktar = document.getElementById('newItemQty') as HTMLInputElement;

// 3. Veri Çekme (GET İsteği) - Backend'den Verileri Alır
async function envanterYükle() {
    try {
        const response = await fetch('http://localhost:5000/api/envanter'); // Backend linkiniz
        if (!response.ok) throw new Error("Backend bağlantısı başarısız.");
        
        const veriler: Malzeme[] = await response.json();
        tabloyuGüncelle(veriler);
    } catch (error) {
        console.error("Hata:", error);
        // ÖDEV KURALI: Fail-Safe (Hata durumunda boş kalmasın diye uyarı veriyoruz)
        inventoryTable.innerHTML = "<tr><td colspan='4'>Veriler yüklenemedi, lütfen Backend'i kontrol edin.</td></tr>";
    }
}

// 4. Veri Gönderme (POST İsteği) - Yeni Malzeme Ekleme
saveBtn?.addEventListener('click', async () => {
    const yeniMalzeme: Malzeme = {
        ad: inputAd.value,
        skt: inputSKT.value,
        miktar: Number(inputMiktar.value)
    };

    if (!yeniMalzeme.ad || !yeniMalzeme.skt) {
        alert("Lütfen tüm alanları doldurun!");
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/envanter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(yeniMalzeme)
        });

        if (response.ok) {
            alert("Malzeme başarıyla eklendi!");
            envanterYükle(); // Listeyi yenile
            formDiv.classList.add('hidden'); // Formu kapat
        }
    } catch (error) {
        alert("Bağlantı hatası: Kaydedilemedi.");
    }
});

// 5. Tabloyu Ekrana Basma Fonksiyonu
function tabloyuGüncelle(liste: Malzeme[]) {
    inventoryTable.innerHTML = ""; // Tabloyu temizle
    liste.forEach(item => {
        const row = `
            <tr>
                <td><strong>${item.ad}</strong></td>
                <td>${item.skt}</td>
                <td>${item.miktar} Adet</td>
                <td><span class="status status--ok">Stokta</span></td>
            </tr>
        `;
        inventoryTable.insertAdjacentHTML('beforeend', row);
    });
}

// Sayfa açıldığında verileri çek
envanterYükle();

// Formu açma/kapama
addBtn?.addEventListener('click', () => formDiv.classList.toggle('hidden'));