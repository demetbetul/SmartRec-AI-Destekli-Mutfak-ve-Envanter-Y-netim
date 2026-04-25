import { getIngredients, saveIngredient } from './storage.js';
window.addEventListener('load', () => {
    console.log("SmartRec Sistemi Hazır: Butonlar ve Hafıza Bağlanıyor...");
    // 1. Elementleri arkadaşının HTML'indeki ID'lere göre yakalıyoruz
    const saveBtn = document.getElementById('saveInventoryBtn');
    const nameInput = document.getElementById('newItemName');
    const expiryInput = document.getElementById('newItemExpiry');
    const qtyInput = document.getElementById('newItemQty');
    const addInventoryForm = document.getElementById('addInventoryForm');
    // 2. Kaydet Butonuna basıldığında yapılacaklar
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            console.log("Kaydet butonuna basıldı, veriler işleniyor...");
            // Boş isim girilmesini engelle
            if (nameInput && nameInput.value.trim() !== "") {
                // Yeni malzeme objesini oluşturuyoruz
                const yeniMalzeme = {
                    id: Date.now().toString(), // Benzersiz ID için o anki zaman
                    name: nameInput.value.trim(),
                    expiryDate: expiryInput.value || 'Belirtilmedi',
                    quantity: qtyInput.value ? `${qtyInput.value} adet` : '1 adet'
                };
                // A. Hafızaya (LocalStorage) Kaydet
                saveIngredient(yeniMalzeme);
                // B. Ekrana anında yansıt (Arkadaşının fonksiyonunu kullanarak)
                if (typeof renderInventory === 'function') {
                    renderInventory(getIngredients());
                }
                // C. Formu temizle ve gizle (Kullanıcı dostu olsun)
                nameInput.value = '';
                expiryInput.value = '';
                qtyInput.value = '';
                addInventoryForm?.classList.add('hidden');
                console.log("Başarılı: " + yeniMalzeme.name + " envantere eklendi!");
                alert("Malzeme başarıyla eklendi!");
            }
            else {
                alert("Lütfen en azından bir malzeme adı giriniz!");
            }
        });
    }
    else {
        console.error("KRİTİK HATA: 'saveInventoryBtn' bulunamadı. HTML dosyanı kontrol et!");
    }
    // 3. Sayfa ilk açıldığında hafızadaki eski malzemeleri listeye bas
    if (typeof renderInventory === 'function') {
        renderInventory(getIngredients());
    }
});
//# sourceMappingURL=app.js.map