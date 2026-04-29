import json
import logging
import os
from datetime import datetime
import shutil
import os
import json
import requests
from dotenv import load_dotenv
import google.generativeai as genai
from deep_translator import GoogleTranslator
from datetime import timedelta

# .env dosyasındaki şifreleri yükle
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")
NUTRITION_API_KEY = os.getenv("NUTRITION_API_KEY")

# Gemini ayarını bir kere yapıyoruz
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

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
    try:
        path = dosya_yolu_getir('inventory.json')
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        envanter = data.get("envanter", [])
        bugun = datetime.now()
        
        kritik_stok = [i["ad"] for i in envanter if i["miktar"] <= 2]
        # SKT'si bugün veya geçmiş olanları bul
        bozulmus_urunler = []
        for i in envanter:
            skt_tarihi = datetime.strptime(i["skt"], "%Y-%m-%d")
            if skt_tarihi <= bugun:
                bozulmus_urunler.append(i["ad"])

        print("\n" + "📊 VERİ ANALİZ RAPORU (Zaman Duyarlı)")
        print(f"🔹 Toplam Çeşit: {len(envanter)}")
        print(f"⚠️ Kritik Stok: {', '.join(kritik_stok) if kritik_stok else 'Yok'}")
        print(f"❌ TARİHİ GEÇMİŞ: {', '.join(bozulmus_urunler) if bozulmus_urunler else 'Hepsi Taze ✨'}")
        print("-" * 30)
        
    except Exception as e:
        logging.error(f"SKT Analiz hatası: {e}")
        
        
def envanter_malzeme_ekle(ad, miktar, birim="Adet", raf_omru_gun=7):
    """
    Veri Yönetim Uzmanı Dokunuşu: 
    Malzemeyi eklerken bugünün tarihine raf ömrünü ekleyerek SKT oluşturur.
    """
    try:
        path = dosya_yolu_getir('inventory.json')
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        temiz_ad = veri_temizle(ad)
        # SKT Hesaplama: Bugün + Raf Ömrü
        skt = (datetime.now() + timedelta(days=raf_omru_gun)).strftime("%Y-%m-%d")
        
        mevcut = next((item for item in data["envanter"] if veri_temizle(item["ad"]) == temiz_ad), None)
        
        if mevcut:
            mevcut["miktar"] += miktar
            mevcut["skt"] = skt # Tarihi de güncellemiş olalım
            print(f"🔄 GÜNCELLEME: {temiz_ad} güncellendi. Yeni SKT: {skt}")
        else:
            yeni_urun = {"ad": temiz_ad, "miktar": miktar, "birim": birim, "skt": skt}
            data["envanter"].append(yeni_urun)
            print(f"✨ YENİ ÜRÜN: {temiz_ad} (SKT: {skt}) eklendi.")
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
    except Exception as e:
        logging.error(f"SKT'li veri ekleme hatası: {e}")
        
    

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
            
        # 1. Önce Yedek Alalım (Güvenlik şart!)
    veri_yedekle()

    # 2. Yeni ve Taze Ürünler Ekleyelim
    # Raf ömrü 7 gün olan bir yoğurt ekleyelim
    #envanter_malzeme_ekle("Yoğurt", 2, "Kilo", raf_omru_gun=7)
    
    # 3. Bilerek Tarihi Geçmiş Bir Ürün Ekleyelim (Sistemi test etmek için)
    # Raf ömrüne -1 verirsek, SKT dünün tarihi olur ve sistem "bozuk" yakalar!
    #envanter_malzeme_ekle("Tavuk", 1, "Paket", raf_omru_gun=-1)

    # 4. Şov Zamanı: Analiz Raporunu Çalıştıralım
    # Bakalım sistem tavuğu yakalayabilecek mi?
    #envanter_istatistikleri()
            
            
            
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

def get_recipes_from_gemini(malzemeler_metni):
    """Asıl servis: Gemini AI'dan dinamik malzemelerle menü ister."""
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    Sen profesyonel bir aşçısın. Elimdeki şu malzemeleri kullanarak bana başlangıç, 
    ana yemek ve tatlıdan oluşan 3 aşamalı bir menü öner: {malzemeler_metni}.
    
    Ayrıca bu yemekleri yapmak için evde eksik olan tahmini 3-4 malzemeyi 'eksik_malzemeler' olarak belirt.
    
    Yanıtı SADECE aşağıdaki JSON formatında ver, dışına hiçbir metin yazma:
    {{
        "kaynak": "gemini",
        "baslangic": "başlangıç yemeği",
        "ana_yemek": "ana yemek",
        "tatli": "tatlı",
        "eksik_malzemeler": ["malzeme1", "malzeme2"]
    }}
    """
    
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(response_mime_type="application/json")
    )
    return json.loads(response.text)

def get_recipes_from_spoonacular(malzemeler_metni):
    """Yedek servis: Gemini çökerse Spoonacular'dan veri çeker (Otomatik Çeviri İçerir)."""
    
    # 1. YENİ EKLENEN KISIM: Türkçe metni İngilizceye çeviriyoruz
    print("🌍 Sistem Uyarısı: Türkçe malzemeler Spoonacular için İngilizceye çevriliyor...")
    try:
        ingilizce_malzemeler = GoogleTranslator(source='tr', target='en').translate(malzemeler_metni)
        print(f"🔄 Çevrilen Malzemeler: {ingilizce_malzemeler}")
    except Exception as e:
        print(f"❌ Çeviri Hatası: {e}")
        ingilizce_malzemeler = malzemeler_metni # Çeviri çökerse orijinalini bırak
        
    # 2. ESKİ KISIM: API'ye artık İngilizce kelimeleri gönderiyoruz
    url = "https://api.spoonacular.com/recipes/findByIngredients"
    params = {
        "ingredients": ingilizce_malzemeler, # Artık buraya İngilizce metin gidiyor!
        "number": 3,
        "apiKey": SPOONACULAR_API_KEY
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    # Spoonacular 3 aşamalı menü mantığını bilmez, o yüzden dönen 3 tarifi bölüştürüyoruz
    return {
        "kaynak": "spoonacular",
        "baslangic": data[0]["title"] if len(data) > 0 else "Tarif bulunamadı",
        "ana_yemek": data[1]["title"] if len(data) > 1 else "Tarif bulunamadı",
        "tatli": data[2]["title"] if len(data) > 2 else "Tarif bulunamadı",
        "eksik_malzemeler": ["Bilinmiyor (Spoonacular verisi)"]
    }

def kalori_hesapla(yemek_adi):
    """Sisteme zaten bağlı olan Spoonacular API ile kalori hesaplar."""
    print(f"📊 {yemek_adi} için kalori hesaplanıyor (Spoonacular)...")
    
    # 1. Yemek adını İngilizceye çevir
    try:
        ingilizce_yemek = GoogleTranslator(source='tr', target='en').translate(yemek_adi)
    except:
        ingilizce_yemek = yemek_adi 
        
    # 2. Spoonacular'ın Gizli Kalori Uç Noktasına (Endpoint) İstek At
    url = "https://api.spoonacular.com/recipes/guessNutrition"
    params = {
        "title": ingilizce_yemek,
        "apiKey": SPOONACULAR_API_KEY # En başta aldığımız şifreyi kullanıyoruz!
    }
    
    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            data = response.json()
            
            # Spoonacular veriyi {"calories": {"value": 315}} şeklinde döner
            # Biz de o "value" kısmını güvenli bir şekilde çekiyoruz
            kalori_degeri = data.get('calories', {}).get('value', 0)
            
            if kalori_degeri > 0:
                return f"{int(kalori_degeri)} kcal"
                
        return "Bilinmiyor"
    except Exception as e:
        print(f"⚠️ Kalori hesaplama hatası: {e}")
        return "Hesaplanamadı"

def akilli_menu_olustur(malzemeler_listesi):
    """Sistemin ana köprüsü. Tarifleri ve kalorileri tek bir JSON'da birleştirir."""
    malzemeler_metni = ", ".join(malzemeler_listesi)
    
    try:
        sonuc = get_recipes_from_gemini(malzemeler_metni)
    except Exception as e:
        print(f"Sistem Uyarısı: Gemini çöktü, yedeğe geçiliyor. ({e})")
        sonuc = get_recipes_from_spoonacular(malzemeler_metni)
        
    # --- YENİ EKLENEN KISIM: Kalorileri Veriye Dahil Et ---
    print("\n🔍 Besin Değerleri Analiz Ediliyor...")
    sonuc["kaloriler"] = {
        "baslangic_kalori": kalori_hesapla(sonuc["baslangic"]),
        "ana_yemek_kalori": kalori_hesapla(sonuc["ana_yemek"]),
        "tatli_kalori": kalori_hesapla(sonuc["tatli"])
    }
    # ------------------------------------------------------
    
    return sonuc
    
if __name__ == "__main__":
    # Diyelim ki inventory.json'dan kullanıcının dolabındaki şu ürünleri okuduk:
    kullanici_dolabi = ["kıyma", "soğan", "sarımsak", "domates salçası", "makarna"]
    
    print("Mutfak Envanteri Analiz Ediliyor...")
    final_menu = akilli_menu_olustur(kullanici_dolabi)
    
    print("\n🍽️ OLUŞTURULAN MENÜ VERİSİ (JSON):")
    print(json.dumps(final_menu, indent=4, ensure_ascii=False))

