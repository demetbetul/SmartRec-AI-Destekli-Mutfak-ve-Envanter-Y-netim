import { getIngredients, saveIngredient } from './storage.js';
import type { Ingredient } from './types.js';

// Arkadaşının listeyi yenileme fonksiyonu
declare function renderInventory(items: any[]): void;

window.addEventListener('load', () => {
    console.log("SmartRec: Sistem başarıyla yüklendi.");

    // --- 1. ELEMENTLERİ BULALIM ---
    const addBtn = document.getElementById('addInventoryBtn');
    const form = document.getElementById('addInventoryForm');
    const nameInput = document.getElementById('newItemName') as HTMLInputElement;
    const expiryInput = document.getElementById('newItemExpiry') as HTMLInputElement;
    const qtyInput = document.getElementById('newItemQty') as HTMLInputElement;
    const saveBtn = document.getElementById('saveInventoryBtn');

    // --- 2. TURUNCU BUTON (AÇ/KAPAT) ---
    if (addBtn && form) {
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            
            const isHidden = form.classList.contains('hidden') || form.style.display === 'none';

            if (isHidden) {
                form.classList.remove('hidden');
                form.style.display = 'block';
                
                setTimeout(() => {
                    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => nameInput?.focus(), 300);
                }, 50);
            } else {
                form.classList.add('hidden');
                form.style.display = 'none';
            }
        }, true);
    }

    // --- 3. AKILLI ODAKLANMA (ENTER GEÇİŞLERİ) ---
    if (nameInput && expiryInput && qtyInput) {
        nameInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                expiryInput.focus();
            }
        };

        expiryInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                qtyInput.focus();
            }
        };

        qtyInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveBtn?.click();
            }
        };
    }
    // ... (Enter geçişleri kodlarının bittiği yer)

   // --- 6. ÖZEL BAŞ HARF FİLTRELEME MİMARİSİ ---
    if (nameInput) {
        const datalist = document.getElementById('material-suggestions') as HTMLDataListElement;
        
        // options'ı HTMLOptionElement dizisi olarak alıyoruz
        const allOptions = datalist ? Array.from(datalist.options) : []; 

        nameInput.addEventListener('input', () => {
            const val = nameInput.value.toLowerCase().trim();
            
            if (!datalist) return;

            // 1. Önce listeyi temizle
            datalist.innerHTML = '';

            // 2. Sadece yazdığın harfle BAŞLAYANLARI geri ekle
            if (val.length > 0) {
                const filtered = allOptions.filter(opt => 
                    opt.value.toLowerCase().startsWith(val)
                );
                
                filtered.forEach(opt => datalist.appendChild(opt));

                // 3. Hata veren yerin çözümü: filtered[0] var mı diye kontrol ekledik
                if (filtered.length === 1 && filtered[0] && filtered[0].value.toLowerCase() === val) {
                    setTimeout(() => {
                        if (expiryInput) expiryInput.focus();
                    }, 200);
                }
            } else {
                // Eğer kutu boşsa tüm listeyi geri getir
                allOptions.forEach(opt => datalist.appendChild(opt));
            }
        });
    }

        // ...

   // --- 4. KAYDET VE FİLTRELEME (1 YAZMAYI ENGELLER) ---
    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            // Önce her şeyi durdur (Capturing modunda yakalıyoruz)
            const nameValue = nameInput.value.trim();
            const harfKontrol = /[a-zA-ZğüşıöçĞÜŞİÖÇ]/;

            // FİLTRE: Boşsa veya içinde hiç harf yoksa ("1", "!!!" gibi)
            if (!nameValue || !harfKontrol.test(nameValue)) {
                e.preventDefault();
                e.stopImmediatePropagation();
                alert("HATA: Geçersiz malzeme adı! Lütfen en az bir harf içeren bir isim girin.");
                nameInput.focus();
                return;
            }

            // Eğer buraya kadar geldiyse isim geçerlidir, kaydı biz yapıyoruz
            e.preventDefault();
            e.stopImmediatePropagation();

            const yeni: Ingredient = {
                id: Date.now().toString(),
                name: nameValue,
                expiryDate: expiryInput.value || 'Belirtilmedi',
                quantity: qtyInput.value ? `${qtyInput.value} adet` : '1 adet'
            };

            saveIngredient(yeni);

            if (typeof renderInventory === 'function') {
                renderInventory(getIngredients());
            }

            // Formu temizle ve kapat
            nameInput.value = '';
            expiryInput.value = '';
            qtyInput.value = '';
            if (form) {
                form.classList.add('hidden');
                form.style.display = 'none';
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
            alert("Malzeme başarıyla eklendi! 😎");

        }, true); // Arkadaşının kodunu 'true' ile eziyoruz
    }

}); // Dosyanın en sonu - window.load kapanışı
