import { getIngredients, saveIngredient } from './storage.js';
// 2. ADIM: Arkadaşının sahte verilerini senin gerçek verilerinle değiştir
let inventoryData = getIngredients();
// 3. ADIM: Başlangıç Kurulumu (Sayfa açıldığında çalışır)
function baslangicVerileriniYukle() {
    // Arkadaşının yazdığı render fonksiyonu yüklendiyse çalıştır
    if (typeof renderInventory === 'function') {
        renderInventory(inventoryData);
        // Üstteki sayaçları senin gerçek veri sayına göre güncelle
        const countEl = document.getElementById('inventoryCount');
        const expiryEl = document.getElementById('expiryCount');
        if (countEl)
            countEl.textContent = inventoryData.length.toString();
        // Yakın tarihli olanları filtreleyip uyarısını verelim
        const expiredItems = inventoryData.filter(i => {
            if (!i.expiryDate || i.expiryDate === 'Belirtilmedi')
                return false;
            const daysLeft = Math.ceil((new Date(i.expiryDate).getTime() - new Date().getTime()) / 86400000);
            return daysLeft <= 3;
        });
        if (expiryEl)
            expiryEl.textContent = expiredItems.length.toString();
    }
}
// 4. ADIM: Ekleme Butonu Köprüsü
const saveBtn = document.getElementById('saveInventoryBtn');
saveBtn?.addEventListener('click', () => {
    const nameInput = document.getElementById('newItemName');
    const expiryInput = document.getElementById('newItemExpiry');
    const qtyInput = document.getElementById('newItemQty');
    if (nameInput && nameInput.value.trim() !== "") {
        // Yeni malzeme objesini senin tipine (Ingredient) göre oluştur
        const yeniMalzeme = {
            id: Date.now().toString(),
            name: nameInput.value.trim(),
            expiryDate: expiryInput.value || 'Belirtilmedi',
            quantity: qtyInput.value ? `${qtyInput.value} adet` : '1 adet'
        };
        // Veriyi KALICI olarak storage'a kaydet
        saveIngredient(yeniMalzeme);
        // Listeyi ve arayüzü güncelle
        inventoryData = getIngredients();
        if (typeof renderInventory === 'function') {
            renderInventory(inventoryData);
        }
        // Sayaç güncelleme
        const countEl = document.getElementById('inventoryCount');
        if (countEl)
            countEl.textContent = inventoryData.length.toString();
        // Temizlik ve Kapatma
        nameInput.value = '';
        expiryInput.value = '';
        qtyInput.value = '';
        document.getElementById('addInventoryForm')?.classList.add('hidden');
        if (typeof showToast === 'function') {
            showToast(`✅ "${yeniMalzeme.name}" başarıyla kaydedildi!`);
        }
    }
});
// Sayfa yüklendiğinde her şeyi başlat
window.addEventListener('load', baslangicVerileriniYukle);
//# sourceMappingURL=app.js.map