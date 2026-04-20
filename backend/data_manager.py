import json
import logging
import os
from datetime import datetime
import shutil

# Dosyanın bulunduğu klasörü ana dizin olarak belirle
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Data klasörüne giden yolu dinamik yap
DATA_DIR = os.path.join(BASE_DIR, '..', 'data')
BACKUP_DIR = os.path.join(BASE_DIR, '..', 'backups')

# Eğer backups klasörü yoksa otomatik oluştur
if not os.path.exists(BACKUP_DIR):
    os.makedirs(BACKUP_DIR)

# Profesyonel Loglama Ayarı
logging.basicConfig(
    filename=os.path.join(BASE_DIR, '..', 'app.log'), # Hataları app.log dosyasına yazar
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s',
    encoding='utf-8'
)

def dosya_yolu_getir(dosya_adi):
    return os.path.join(DATA_DIR, dosya_adi)

def veri_dogrula(veri, tip):
    """
    Veri İşleme Uzmanı Kontrolü: 
    Yüklenen verinin şemaya uygun olup olmadığını denetler.
    """
    if tip == "envanter":
        for item in veri.get("envanter", []):
            if not all(k in item for k in ("ad", "miktar", "skt")):
                return False, f"Eksik alan bulundu: {item.get('ad', 'Bilinmeyen')}"
    
    if tip == "tarif":
        for tarif in veri.get("tarifler", []):
            if "malzemeler" not in tarif or not isinstance(tarif["malzemeler"], list):
                return False, f"Hatalı tarif yapısı: {tarif.get('ad', 'Bilinmeyen')}"
                
    return True, "Veri temiz!"

def veri_temizle(metin):
    """
    Veri İşleme Uzmanı Dokunuşu: 
    Metindeki gereksiz boşlukları siler ve tamamen küçük harfe çevirir.
    """
    if isinstance(metin, str):
        return metin.strip().lower()
    return metin

def veriyi_yukle():
    path = dosya_yolu_getir('recipes.json')
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
            # --- VERİ TEMİZLEME DOKUNUŞU ---
            # Her tarifin adını ve malzemelerini daha yüklerken temizleyelim
            for tarif in data.get("tarifler", []):
                tarif["ad"] = veri_temizle(tarif["ad"])
                tarif["malzemeler"] = [veri_temizle(m) for m in tarif["malzemeler"]]
            
            durum, mesaj = veri_dogrula(data, "tarif")
            if not durum:
                logging.error(f"Doğrulama hatası: {mesaj}")
                return []
            
        return data["tarifler"]
    except Exception as e:
        logging.error(f"Yükleme hatası: {e}")
        return []
        
    except FileNotFoundError:
        logging.error(f"❌ Hata: {path} dosyası bulunamadı! Lütfen veri yollarını kontrol et.")
        return []
    except json.JSONDecodeError:
        logging.error(f"❌ Hata: JSON dosyasının formatı bozuk (virgül veya parantez hatası olabilir).")
        return []

# Basit bir test yapalım:
tarifler = veriyi_yukle()
if isinstance(tarifler, list):
    print(f"Sistem hazır! Toplam {len(tarifler)} adet yedek tarif yüklendi.")
    for tarif in tarifler:
        print(f"- {tarif['ad']} ({tarif['kalori']} kcal)")
else:
    print(tarifler)
    
from datetime import datetime

def skt_kontrol(urun_tarihi):
    bugun = datetime.now()
    skt = datetime.strptime(urun_tarihi, "%Y-%m-%d")
    
    if skt < bugun:
        return "⚠️ BOZULMUŞ!"
    else:
        return "✅ Taze"



def eksik_malzemeleri_bul(tarif_malzemeleri):
    """
    tarif_malzemeleri: AI'dan gelen malzele listesi ['Domates', 'Yumurta', 'Peynir']
    """
    # 1. Önce envanterimizi yükleyelim
    try:
        with open('data/inventory.json', 'r', encoding='utf-8') as f:
            envanter_verisi = json.load(f)
            # Sadece malzeme isimlerinden oluşan bir liste yapalım
            evdeki_malzemeler = [item['ad'].lower() for item in envanter_verisi['envanter']]
    except FileNotFoundError:
        return "Hata: Envanter dosyası bulunamadı!"

    # 2. Karşılaştırma yapalım
    eksikler = []
    for malzeme in tarif_malzemeleri:
        if malzeme.lower() not in evdeki_malzemeler:
            eksikler.append(malzeme)
    
    return eksikler



def kalori_hesapla(tarif_malzemeleri):
    """
    tarif_malzemeleri: {'yumurta': 2, 'domates': 100} gibi miktar içeren bir sözlük
    """
    try:
        with open('data/nutrition.json', 'r', encoding='utf-8') as f:
            nut_data = json.load(f)['besin_degerleri']
    except FileNotFoundError:
        return "Besin verisi bulunamadı!"

    toplam_kalori = 0
    for malzeme, miktar in tarif_malzemeleri.items():
        if malzeme.lower() in nut_data:
            # Basit bir hesap: (miktar * 100gr kalorisi) / 100 
            # (Eğer adetse direkt miktar ile çarpabiliriz, şimdilik düz mantık gidelim)
            toplam_kalori += (miktar * nut_data[malzeme.lower()]) / 100
    
    return round(toplam_kalori, 2)



def akilli_tarif_filtrele(etiket=None, zorluk_seviyesi=None):
    """
    Kullanıcın isteğine göre tarifleri filtreler.
    Örn: etiket='vejetaryen' veya zorluk_seviyesi='Kolay'
    """
    try:
        with open('data/recipes.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            tarifler = data['yedek_tarifler']
            
            sonuclar = []
            for tarif in tarifler:
                # Etiket kontrolü
                etiket_uygun_mu = (etiket is None) or (etiket.lower() in [t.lower() for t in tarif.get('etiketler', [])])
                # Zorluk kontrolü
                zorluk_uygun_mu = (zorluk_seviyesi is None) or (tarif.get('zorluk', '').lower() == zorluk_seviyesi.lower())
                
                if etiket_uygun_mu and zorluk_uygun_mu:
                    sonuclar.append(tarif)
            
            return sonuclar
    except Exception as e:
        return f"Filtreleme hatası: {e}"
    
def eksik_malzemeleri_bul(tarif_id):
    try:
        # 1. Tarifleri ve Envanteri yükle
        with open('data/recipes.json', 'r', encoding='utf-8') as f:
            tarifler = json.load(f)["tarifler"]
        with open('data/inventory.json', 'r', encoding='utf-8') as f:
            envanter_verisi = json.load(f)["envanter"]

        # 2. İlgili tarifi ID ile bul
        secilen_tarif = next((t for t in tarifler if t["id"] == tarif_id), None)
        if not secilen_tarif:
            return "Tarif bulunamadı!"

        # 3. Evdeki malzemelerin listesini al (Küçük harf standardıyla!)
        evdeki_malzemeler = [item["ad"].lower() for item in envanter_verisi]
        
        # 4. Karşılaştır
        eksikler = []
        for malzeme in secilen_tarif["malzemeler"]:
            if malzeme.lower() not in evdeki_malzemeler:
                eksikler.append(malzeme)
        
        return eksikler
    except Exception as e:
        return f"Hata: {e}"
    
def ai_icin_malzeme_listesi_hazirla():
    try:
        path = dosya_yolu_getir('inventory.json')
        with open(path, 'r', encoding='utf-8') as f:
            envanter_data = json.load(f)
        
        # Buraya dikkat: Listenin içindeki her bir item'ın 'ad' alanını çekiyoruz
        # Eğer sadece 'envanter_data'yı metne çevirirsen harf harf ayırır.
        malzemeler = [veri_temizle(item["ad"]) for item in envanter_data.get("envanter", [])]
        
        return malzemeler # Burası bir LİSTE döndürmeli, metin değil!
    except Exception as e:
        logging.error(f"AI malzeme listesi hatası: {e}")
        return []
    
def yemeği_gunluge_kaydet(yemek_adi, toplam_kalori):
    """
    Kullanıcının yediği yemeği ve tarihini daily_log.json dosyasına ekler.
    Tasarımcı bu veriyi alıp grafik çizecek.
    """
    import datetime
    
    log_dosyasi = 'data/daily_log.json'
    tarih = datetime.datetime.now().strftime("%Y-%m-%d")
    
    try:
        # Mevcut kayıtları oku
        with open(log_dosyasi, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Yeni kaydı oluştur
        yeni_kayit = {
            "tarih": tarih,
            "yemek": yemek_adi,
            "kalori": toplam_kalori
        }
        
        data["gunluk_kayitlar"].append(yeni_kayit)
        
        # Dosyayı güncelle
        with open(log_dosyasi, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        print(f"✅ {yemek_adi} günlüğe kaydedildi! Grafik için veri hazır.")
    except Exception as e:
        print(f"❌ Günlük kaydı hatası: {e}")

def envanter_guncelle(yemek_adi):
    """
    Veri İşleme Uzmanı Kontrolü: 
    Yemek yapıldığında malzemeleri stoktan düşer.
    """
    try:
        # 1. Verileri dinamik yollarla çekelim
        tarifler = veriyi_yukle()
        envanter_path = dosya_yolu_getir('inventory.json')
        
        with open(envanter_path, 'r', encoding='utf-8') as f:
            envanter_data = json.load(f)

        # 2. Seçilen yemeği veritabanında bulalım
        secilen_tarif = next((t for t in tarifler if t["ad"].lower() == yemek_adi.lower()), None)
        
        if secilen_tarif:
            # Tarifteki her bir malzeme için dolaba bakalım
            for malzeme in secilen_tarif["malzemeler"]:
                for stok in envanter_data["envanter"]:
                    if veri_temizle(stok["ad"]) == veri_temizle(malzeme):
                        # Stok miktarını 1 azalt (0'ın altına düşmesin diye max kullandık)
                        stok["miktar"] = max(0, stok["miktar"] - 1)
            
            # 3. Güncellenmiş yeni envanteri dosyaya geri yazalım
            with open(envanter_path, 'w', encoding='utf-8') as f:
                json.dump(envanter_data, f, ensure_ascii=False, indent=2)
            
            print(f"✅ VERİ GÜNCELLEME: {yemek_adi} yapıldı, stoklar düşüldü.")
        else:
            print(f"⚠️ Hata: {yemek_adi} isimli bir tarif bulunamadı.")
            
    except Exception as e:
        print(f"❌ Veri güncelleme hatası: {e}")
        
def veri_yedekle():
    """
    Veri İşleme Uzmanı Güvenlik Önlemi: 
    Kritik veri dosyalarını tarih damgasıyla yedekler.
    """
    dosyalar = ['recipes.json', 'inventory.json', 'nutrition.json']
    zaman_damgasi = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    try:
        for dosya in dosyalar:
            kaynak = dosya_yolu_getir(dosya)
            if os.path.exists(kaynak):
                yedek_adi = f"{dosya.split('.')[0]}_{zaman_damgasi}.json"
                hedef = os.path.join(BACKUP_DIR, yedek_adi)
                shutil.copy2(kaynak, hedef)
        
        print(f"🛡️ GÜVENLİK: Veri yedekleri '{zaman_damgasi}' etiketiyle alındı.")
    except Exception as e:
        logging.error(f"Yedekleme hatası: {e}")
        print("⚠️ Yedekleme sırasında bir hata oluştu, loglara bakınız.")
        
def envanter_istatistikleri():
    """
    Veri Analizi Uzmanı Notu: 
    Envanterdeki ürünlerin genel durumunu analiz eder.
    """
    try:
        path = dosya_yolu_getir('inventory.json')
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        envanter = data.get("envanter", [])
        total_item = len(envanter)
        kritik_urunler = [item["ad"] for item in envanter if item["miktar"] <= 2]
        
        print("\n" + "📊 VERİ ANALİZ RAPORU")
        print(f"🔹 Toplam Çeşit Ürün: {total_item}")
        print(f"⚠️ Kritik Stok (2 altı): {', '.join(kritik_urunler) if kritik_urunler else 'Yok'}")
        print("-" * 20)
        
    except Exception as e:
        logging.error(f"İstatistik hatası: {e}")
        
        
def envanter_malzeme_ekle(ad, miktar, birim="Adet"):
    """
    Veri Yönetim Uzmanı Dokunuşu: 
    Yeni bir malzemeyi temizleyerek ve doğrulayarak envantere ekler.
    """
    try:
        path = dosya_yolu_getir('inventory.json')
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 1. Veriyi Temizle (Standardizasyon)
        temiz_ad = veri_temizle(ad)
        
        # 2. Ürün zaten var mı kontrol et (Varsa miktarını artır)
        mevcut = next((item for item in data["envanter"] if veri_temizle(item["ad"]) == temiz_ad), None)
        
        if mevcut:
            mevcut["miktar"] += miktar
            print(f"🔄 GÜNCELLEME: {temiz_ad} miktarı {mevcut['miktar']} oldu.")
        else:
            # 3. Yeni Ürün Ekle
            yeni_urun = {"ad": temiz_ad, "miktar": miktar, "birim": birim}
            data["envanter"].append(yeni_urun)
            print(f"✨ YENİ ÜRÜN: {temiz_ad} envantere eklendi.")
        
        # 4. Kaydet (Persistence)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
    except Exception as e:
        logging.error(f"Veri ekleme hatası: {e}")
        
    

if __name__ == "__main__":
    print("\n" + "="*30)
    print("🚀 SMARTREC SİSTEM KONTROLÜ")
    print("="*30 + "\n")

    # 1. ADIM: Verileri Güvene Al (Yedekleme)
    # Bu satır sayesinde 'backups' klasörün dolacak
    veri_yedekle()

    # 2. ADIM: Verileri Yükle ve Kontrol Et
    tarifler = veriyi_yukle()

    if tarifler:
        print(f"✅ Veritabanı: {len(tarifler)} tarif başarıyla yüklendi.")
        
        # Vejetaryen filtreleme testimiz
        veg_tarifler = [t for t in tarifler if "vejetaryen" in [v.lower() for v in t.get("kategoriler", [])]]
        print(f"🌱 Filtreleme: {len(veg_tarifler)} adet vejetaryen tarif bulundu.")
        
        print("\n" + "="*30)
        print("✨ SİSTEM ŞU AN KUSURSUZ ÇALIŞIYOR!")
        print("="*30 + "\n")
        
        envanter_listesi = ai_icin_malzeme_listesi_hazirla()
        if envanter_listesi:
            # Hem temiz görünsün hem de kaç tane olduğunu söylesin
            print(f"🤖 AI HAZIRLIK: Toplam {len(envanter_listesi)} malzeme başarıyla paketlendi.")
            # İstersen ilk 5 tanesini örnek olarak gösterebilirsin:
            print(f"📋 Örnek Malzemeler: {', '.join(envanter_listesi[:5])}...")
            
            
envanter_istatistikleri()

# 5. ADIM: Dinamik Veri Ekleme Testi
# Olmayan bir şey ekleyelim
#envanter_malzeme_ekle("Ejder Meyvesi", 5, "Adet")
# Olan bir şeyin miktarını artıralım
#envanter_malzeme_ekle("Domates", 3, "Adet")
    
# Güncel durumu görmek için istatistikleri tekrar çağıralım
#envanter_istatistikleri()

# 4. ADIM: Opsiyonel Testler (İhtiyaç duyduğunda '#' kaldırabilirsin)
# envanter_guncelle("Menemen")
    
# AI Malzeme Listesi Testi
#ai_listesi = ai_icin_malzeme_listesi_hazirla()
#print(f"\n🤖 AI'ya Gidecek Malzemeler: {ai_listesi}")
    
# Günlük Kayıt Testi
#yemeği_gunluge_kaydet("Kuru Fasulye", 600)