import json
import logging
import os
import shutil
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv
import google.generativeai as genai
from deep_translator import GoogleTranslator
import random
import urllib.parse

# .env dosyasındaki şifreleri yükle
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")
NUTRITION_API_KEY = os.getenv("NUTRITION_API_KEY")

# API Keys Validasyon
if not GEMINI_API_KEY:
    logging.warning("⚠️ GEMINI_API_KEY not found in .env file")
if not SPOONACULAR_API_KEY:
    logging.warning("⚠️ SPOONACULAR_API_KEY not found in .env file")

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
    except FileNotFoundError:
        logging.error(f"❌ Hata: {path} dosyası bulunamadı! Lütfen veri yollarını kontrol et.")
        return []
    except json.JSONDecodeError:
        logging.error(f"❌ Hata: JSON dosyasının formatı bozuk (virgül veya parantez hatası olabilir).")
        return []
    except Exception as e:
        logging.error(f"Yükleme hatası: {e}")
        return []


def akilli_tarif_filtrele(etiket=None, zorluk_seviyesi=None):
    """
    Kullanıcın isteğine göre tarifleri filtreler.
    Örn: etiket='vejetaryen' veya zorluk_seviyesi='Kolay'
    """
    try:
        tarifler = veriyi_yukle()
        
        sonuclar = []
        for tarif in tarifler:
            # Etiket kontrolü
            etiket_uygun_mu = (etiket is None) or (etiket.lower() in [veri_temizle(t) for t in tarif.get('etiketler', [])])
            # Zorluk kontrolü
            zorluk_uygun_mu = (zorluk_seviyesi is None) or (veri_temizle(tarif.get('zorluk', '')) == veri_temizle(zorluk_seviyesi))
            
            if etiket_uygun_mu and zorluk_uygun_mu:
                sonuclar.append(tarif)
        
        return sonuclar
    except Exception as e:
        logging.error(f"Filtreleme hatası: {e}")
        return []


def skt_kontrol(urun_tarihi):
    bugun = datetime.now()
    skt = datetime.strptime(urun_tarihi, "%Y-%m-%d")
    
    if skt < bugun:
        return "⚠️ BOZULMUŞ!"
    else:
        return "✅ Taze"



def eksik_malzemeleri_bul(tarif_id):
    """
    Belirtilen tarif ID'si için envanterden eksik olan malzemeleri bulur.
    """
    try:
        # 1. Tarifleri ve Envanteri yükle
        tarifler = veriyi_yukle()
        
        # 2. Envanteri yükle
        envanter_path = dosya_yolu_getir('inventory.json')
        with open(envanter_path, 'r', encoding='utf-8') as f:
            envanter_verisi = json.load(f)["envanter"]

        # 3. İlgili tarifi ID ile bul
        secilen_tarif = next((t for t in tarifler if t.get("id") == tarif_id), None)
        if not secilen_tarif:
            return []

        # 4. Evdeki malzemelerin listesini al (Küçük harf standardıyla!)
        evdeki_malzemeler = [veri_temizle(item["ad"]) for item in envanter_verisi]
        
        # 5. Karşılaştır
        eksikler = []
        for malzeme in secilen_tarif.get("malzemeler", []):
            if veri_temizle(malzeme) not in evdeki_malzemeler:
                eksikler.append(malzeme)
        
        return eksikler
    except Exception as e:
        logging.error(f"Eksik malzeme bulma hatası: {e}")
        return []
    
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
    log_dosyasi = dosya_yolu_getir('daily_log.json')
    tarih = datetime.now().strftime("%Y-%m-%d")
    
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


def get_recipes_from_gemini(malzemeler_metni):
    """Asıl servis: Gemini AI'dan dinamik malzemelerle 3 FARKLI menü alternatifi ister."""
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    Sen profesyonel bir aşçısın. Elimdeki şu malzemeleri kullanarak bana BİRBİRİNDEN FARKLI 3 ADET MENÜ ALTERNATİFİ öner: {malzemeler_metni}.
    
    Her menü alternatifinde başlangıç, ana yemek ve tatlı KESİNLİKLE olmalıdır. 
    Ayrıca her menü için evde eksik olan tahmini 3-4 malzemeyi 'eksik_malzemeler' olarak belirt.
    
    Yanıtı SADECE aşağıdaki JSON formatında ver, dışına hiçbir metin veya açıklama yazma:
    {{
        "kaynak": "gemini",
        "menuler": [
            {{
                "id": 1,
                "baslangic": "1. Menü Başlangıç Yemeği",
                "ana_yemek": "1. Menü Ana Yemek",
                "tatli": "1. Menü Tatlı",
                "eksik_malzemeler": ["malzeme1", "malzeme2"]
            }},
            {{
                "id": 2,
                "baslangic": "2. Menü Başlangıç Yemeği",
                "ana_yemek": "2. Menü Ana Yemek",
                "tatli": "2. Menü Tatlı",
                "eksik_malzemeler": ["malzeme3", "malzeme4"]
            }},
            {{
                "id": 3,
                "baslangic": "3. Menü Başlangıç Yemeği",
                "ana_yemek": "3. Menü Ana Yemek",
                "tatli": "3. Menü Tatlı",
                "eksik_malzemeler": ["malzeme5", "malzeme6"]
            }}
        ]
    }}
    """
    
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(response_mime_type="application/json")
    )
    return json.loads(response.text)

def get_recipes_from_spoonacular(malzemeler_metni):
    """Yedek servis: Gemini çökerse Spoonacular'dan 9 tarif çekip 3 menü oluşturur."""
    print("🌍 Sistem Uyarısı: Türkçe malzemeler Spoonacular için İngilizceye çevriliyor...")
    try:
        ingilizce_malzemeler = GoogleTranslator(source='tr', target='en').translate(malzemeler_metni)
    except Exception as e:
        print(f"❌ Çeviri Hatası: {e}")
        ingilizce_malzemeler = malzemeler_metni 
        
    url = "https://api.spoonacular.com/recipes/findByIngredients"
    params = {
        "ingredients": ingilizce_malzemeler, 
        "number": 9, # 3 menü * 3 yemek = 9 tarif çekiyoruz
        "apiKey": SPOONACULAR_API_KEY
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    # 9 tarifi 3'erli gruplar halinde 3 menüye bölüştürüyoruz
    menuler = []
    for i in range(3):
        menuler.append({
            "id": i + 1,
            "baslangic": data[i*3]["title"] if len(data) > i*3 else "Tarif bulunamadı",
            "ana_yemek": data[i*3+1]["title"] if len(data) > i*3+1 else "Tarif bulunamadı",
            "tatli": data[i*3+2]["title"] if len(data) > i*3+2 else "Tarif bulunamadı",
            "eksik_malzemeler": ["Bilinmiyor (Spoonacular verisi)"]
        })
        
    return {
        "kaynak": "spoonacular",
        "menuler": menuler
    }


def get_recipes_from_local(malzemeler_listesi):
    """3. Savunma Hattı: Hem Gemini hem Spoonacular çökerse kendi recipes.json dosyamızdan 3 menü çeker."""
    print("📂 Sistem Uyarısı: API'ler çöktü, yerel tarif veritabanına (recipes.json) başvuruluyor...")
    
    # Kendi yazdığınız tarifleri çekiyoruz
    tum_tarifler = veriyi_yukle() 
    
    # Eğer dosya boşsa acil durum menüsü döndür
    if not tum_tarifler:
        return {
            "kaynak": "yerel_veritabani_hata",
            "menuler": [{
                "id": 1, "baslangic": "Hazır Çorba", "ana_yemek": "Makarna", "tatli": "Meyve", "eksik_malzemeler": []
            }]
        }
    
    # 9 tane tarif seç (Eğer 9 tarif yoksa olanların hepsini al)
    cekilecek_sayi = min(9, len(tum_tarifler))
    secilenler = random.sample(tum_tarifler, cekilecek_sayi)
    
    menuler = []
    for i in range(3):
        bas_idx = i * 3
        menuler.append({
            "id": i + 1,
            # Tarifin "ad" kısmını güvenli bir şekilde alıyoruz
            "baslangic": secilenler[bas_idx].get("ad", "Çorba") if len(secilenler) > bas_idx else "Günün Çorbası",
            "ana_yemek": secilenler[bas_idx+1].get("ad", "Ana Yemek") if len(secilenler) > bas_idx+1 else "Günün Yemeği",
            "tatli": secilenler[bas_idx+2].get("ad", "Tatlı") if len(secilenler) > bas_idx+2 else "Günün Tatlısı",
            "eksik_malzemeler": ["Bilinmiyor (Yerel Veri)"]
        })
        
    return {
        "kaynak": "yerel_veritabani",
        "menuler": menuler
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
    """Sistemin ana köprüsü. 3 farklı menüyü ve kalorileri tek bir JSON'da birleştirir."""
    malzemeler_metni = ", ".join(malzemeler_listesi)
    
    # 1. PLAN: GEMINI AI
    try:
        sonuc = get_recipes_from_gemini(malzemeler_metni)
    except Exception as e:
        print(f"⚠️ Sistem Uyarısı: Gemini çöktü, 1. yedeğe geçiliyor. ({e})")
        
        # 2. PLAN: SPOONACULAR API
        try:
            sonuc = get_recipes_from_spoonacular(malzemeler_metni)
        except Exception as e2:
            print(f"❌ Sistem Uyarısı: Spoonacular da çöktü, 2. yedeğe (Yerel JSON) geçiliyor. ({e2})")
            
            # 3. PLAN: YEREL JSON (recipes.json)
            sonuc = get_recipes_from_local(malzemeler_listesi)
            
    print("\n🔍 3 Menü İçin Besin Değerleri Analiz Ediliyor (Bu biraz sürebilir)...")
    
    # 3 menünün de içine girip her bir yemek için kalori hesaplıyoruz
    for menu in sonuc.get("menuler", []):
        # 1. Kalorileri ekle
        menu["kaloriler"] = {
            "baslangic_kalori": kalori_hesapla(menu["baslangic"]),
            "ana_yemek_kalori": kalori_hesapla(menu["ana_yemek"]),
            "tatli_kalori": kalori_hesapla(menu["tatli"])
        }
        
        # 2. YENİ: Fotoğrafları ekle
        menu["gorseller"] = {
            "baslangic_foto": yemek_fotografi_bul(menu["baslangic"]),
            "ana_yemek_foto": yemek_fotografi_bul(menu["ana_yemek"]),
            "tatli_foto": yemek_fotografi_bul(menu["tatli"])
        }
    
    return sonuc

def rastgele_chatbot_tarifi(envanter_listesi):
    """
    Kullanıcının envanterine göre samimi bir dille tek bir sürpriz tarif önerir.
    """
    print("🤖 Chatbot Aşçı devreye giriyor...")
    
    # Envanteri virgüllü bir metne çeviriyoruz
    malzemeler_metni = ", ".join(envanter_listesi) if envanter_listesi else "temel ev malzemeleri (tuz, yağ, un vb.)"
    
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    Sen enerjik, esprili ve samimi bir yapay zeka mutfak şefisin.
    Kullanıcının dolabındaki malzemeler şunlar: {malzemeler_metni}
    
    Kullanıcı sana "Bugün ne pişirsem?" diye sordu. Dışarıdan yemek sipariş etmeyi unutturacak, 
    elindeki malzemelerle yapılabilecek (tuz, yağ, su gibi temel ev malzemelerini varsayabilirsin) 
    sürpriz ve tek tabaklık harika bir tarif öner.
    
    Cevabını KESİNLİKLE sadece aşağıdaki JSON formatında ver, dışına hiçbir metin veya markdown yazma:
    {{
        "chatbot_giris_mesaji": "Selam! Bugün dolabındaki malzemelerle harika bir şey yapacağız...",
        "tarif_adi": "Yaratıcı Yemeğin Adı",
        "hazirlik_suresi": "25 dakika",
        "malzemeler": ["malzeme 1", "malzeme 2"],
        "adimlar": ["1. Önce yağı kızdırın.", "2. Soğanları ekleyin."]
    }}
    """
    
    try:
        # JSON formatına zorluyoruz
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        return json.loads(response.text)
    except Exception as e:
        logging.error(f"Chatbot tarif hatası: {e}")
        return {
            "chatbot_giris_mesaji": "Mutfakta ufak bir kaza oldu, tarif defterimi bulamıyorum!",
            "tarif_adi": "Sistem Hatası",
            "hazirlik_suresi": "?",
            "malzemeler": [],
            "adimlar": []
        }
    
def ai_tarif_detayi_getir(yemek_adi, envanter_listesi):
    """Sadece istenen yemeğin adım adım tarifini JSON olarak üretir."""
    print(f"👨‍🍳 AI Şef {yemek_adi} için mutfağa girdi...")
    
    malzemeler_metni = ", ".join(envanter_listesi) if envanter_listesi else "temel ev malzemeleri"
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    Sen profesyonel bir şefsin. Kullanıcı "{yemek_adi}" yemeğini yapmak istiyor.
    Kullanıcının dolabındaki malzemeler: {malzemeler_metni}.
    
    Lütfen bu yemeğin adım adım yapılış tarifini, KESİNLİKLE kullanıcının dolabındaki malzemelere öncelik vererek (ve eksik varsa temel malzemeleri varsayarak) oluştur.
    
    Yanıtı SADECE aşağıdaki JSON formatında ver, dışına markdown veya açıklama yazma:
    {{
        "yemek_adi": "{yemek_adi}",
        "hazirlik_suresi": "35 Dakika",
        "porsiyon": "2 Kişilik",
        "kullanilan_malzemeler": ["malzeme 1", "malzeme 2"],
        "adimlar": ["1. Adım açıklaması...", "2. Adım açıklaması..."]
    }}
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"❌ Tarif detay hatası: {e}")
        return {
            "yemek_adi": yemek_adi,
            "hazirlik_suresi": "?",
            "porsiyon": "?",
            "kullanilan_malzemeler": [],
            "adimlar": ["Tarif yüklenirken bir hata oluştu, lütfen tekrar tıklayın."]
        }
    
def akilli_envanter_analizi():
    """Dolaptaki ürünlerin tarihlerine bakıp AI destekli samimi uyarılar üretir."""
    print("🔮 AI Kahin envanteri inceliyor...")
    try:
        path = dosya_yolu_getir('inventory.json')
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        envanter = data.get("envanter", [])
        if not envanter:
            return {
                "durum": "iyi", 
                "ai_mesaji": "Dolabın tertemiz (çünkü bomboş)! Alışveriş zamanı gelmiş.",
                "kurtarilacak_urunler": []
            }
        
        # Promptu çok şişirmemek için sadece ad ve SKT bilgilerini alıyoruz
        ozet_envanter = [{"ad": u.get("ad"), "skt": u.get("skt")} for u in envanter if u.get("ad") and u.get("skt")]
        
        # Bugünün tarihini çekiyoruz ki AI ne kadar zaman kaldığını bilsin
        bugun = datetime.now().strftime("%Y-%m-%d")
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = f"""
        Sen sevimli ve dikkatli bir mutfak asistanısın. Bugünün tarihi: {bugun}.
        Kullanıcının dolabındaki ürünler ve son kullanma tarihleri (skt) şunlar:
        {ozet_envanter}
        
        Lütfen tarihleri bugünün tarihiyle karşılaştır.
        - Tarihi geçmiş veya geçmek üzere olan (1-3 gün kalmış) ürünleri tespit et.
        - Kullanıcıya chatbot tarzında, tek veya iki cümlelik samimi bir bildirim yaz. 
          Örnek: "Sütün son kullanma tarihi yarın doluyor, ondan hemen güzel bir sütlaç yapmaya ne dersin?"
        - Eğer her şey tazeyse: "Tüm ürünlerin taptaze, mutfakta işler harika gidiyor!" gibi motive edici bir şey de.
        
        Cevabını SADECE aşağıdaki JSON formatında ver, dışına markdown veya açıklama yazma:
        {{
            "durum": "kritik",  // veya her şey tazeyse "iyi"
            "ai_mesaji": "Buraya yazdığın samimi mesaj gelecek",
            "kurtarilacak_urunler": ["bozulmak_uzere_olan_urun1", "urun2"]
        }}
        """
        
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"❌ AI Analiz Hatası: {e}")
        return {
            "durum": "bilinmiyor",
            "ai_mesaji": "Sistemde ufak bir yavaşlık var, dolabın içini tam göremedim. Tarihleri kendin kontrol etsen iyi olur!",
            "kurtarilacak_urunler": []
        }

def secili_malzemelerle_tek_tarif(secilen_malzemeler):
    """Kullanıcının arayüzden özel olarak seçtiği malzemelerle tek bir yıldız tarif üretir."""
    print(f"🎯 Özel Şef devrede! Sadece şu malzemelere odaklanılıyor: {secilen_malzemeler}")
    
    malzemeler_metni = ", ".join(secilen_malzemeler)
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    Sen usta ve yaratıcı bir şefsin. Kullanıcı sana şu malzemeleri verdi: {malzemeler_metni}.
    
    Senden İSTENEN: Bu malzemeleri KESİNLİKLE BAŞROLDE kullanarak (tuz, karabiber, yağ, su gibi temel ev malzemelerini ekleyebilirsin) 
    harika ve iştah açıcı tek bir yemek tarifi oluşturman.
    
    Cevabını SADECE aşağıdaki JSON formatında ver, dışına hiçbir metin veya markdown yazma:
    {{
        "yemek_adi": "Özel Yaratıcı Yemeğin Adı",
        "hazirlik_suresi": "30 Dakika",
        "porsiyon": "2 Kişilik",
        "kullanilan_ana_malzemeler": ["{malzemeler_metni}"],
        "eklenen_temel_malzemeler": ["Zeytinyağı", "Tuz"],
        "adimlar": ["1. Adım...", "2. Adım..."],
        "puf_noktasi": "Bu yemeğin lezzet sırrı..."
    }}
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"❌ Özel tarif hatası: {e}")
        return {
            "yemek_adi": "Yaratıcı Tarif Bulunamadı",
            "hazirlik_suresi": "?",
            "adimlar": ["Şu an mutfakta bir yoğunluk var, lütfen tekrar deneyin."],
            "puf_noktasi": ""
        }
    
def alisveris_linkleri_olustur(eksik_malzemeler):
    """Eksik malzemeleri alır ve online market (Sanalmarket) arama linklerine dönüştürür."""
    print("🛒 Alışveriş robotu eksikler için sepet linklerini hazırlıyor...")
    linkli_liste = []
    
    for malzeme in eksik_malzemeler:
        # Türkçe karakterleri (ş, ç, ö vb.) URL formatına (%C5%9F gibi) çeviririz
        url_uyumlu_isim = urllib.parse.quote(malzeme)
        
        # Migros Sanal Market altyapısını kullanıyoruz
        arama_linki = f"https://www.migros.com.tr/arama?q={url_uyumlu_isim}"
        
        linkli_liste.append({
            "malzeme": malzeme,
            "satin_al_linki": arama_linki
        })
        
    return linkli_liste

def yemek_fotografi_bul(yemek_adi):
    """Spoonacular -> Google Custom Search -> Varsayılan Görsel hiyerarşisiyle çalışır."""
    print(f"📸 '{yemek_adi}' için görsel aranıyor...")
    varsayilan_foto = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    
    # === 1. AŞAMA: SPOONACULAR (Ana Kaynak) ===
    try:
        ingilizce_ad = GoogleTranslator(source='tr', target='en').translate(yemek_adi)
        url = "https://api.spoonacular.com/recipes/complexSearch"
        params = {"query": ingilizce_ad, "number": 1, "apiKey": SPOONACULAR_API_KEY}
        
        response = requests.get(url, params=params)
        if response.status_code == 200:
            data = response.json()
            if data.get("results") and len(data["results"]) > 0:
                print(f"✅ {yemek_adi} görseli Spoonacular'dan bulundu.")
                return data["results"][0]["image"]
    except Exception as e:
        print(f"⚠️ Spoonacular Hatası: {e}")

    # === 2. AŞAMA: GOOGLE GÖRSELLER (1. Yedek) ===
    print(f"🔍 Spoonacular bulamadı, '{yemek_adi}' Google Görseller'de aranıyor...")
    try:
        # Bunları .env dosyasından okuyacak (Eğer yoksa Null döner, sistem çökmez)
        GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") 
        GOOGLE_CX = os.getenv("GOOGLE_CX") # Özel Arama Motoru ID'si
        
        if GOOGLE_API_KEY and GOOGLE_CX:
            google_url = "https://www.googleapis.com/customsearch/v1"
            g_params = {
                "q": yemek_adi + "tarifi", # Daha doğru sonuç için "yemeği" kelimesi eklendi
                "cx": GOOGLE_CX,
                "key": GOOGLE_API_KEY,
                "searchType": "image",
                "num": 1 # Sadece 1 fotoğraf getir
            }
            g_res = requests.get(google_url, params=g_params)
            
            if g_res.status_code == 200:
                g_data = g_res.json()
                if "items" in g_data and len(g_data["items"]) > 0:
                    print(f"✅ {yemek_adi} görseli Google'dan bulundu.")
                    return g_data["items"][0]["link"]
            else:
                 print(f"⚠️ Google API Yanıt Vermedi (Kota bitmiş veya yetkisiz).")
        else:
            print("⚠️ Google API şifreleri .env dosyasında bulunamadı (Atlanıyor).")
            
    except Exception as e:
        print(f"⚠️ Google Arama Hatası: {e}")

    # === 3. AŞAMA: VARSAYILAN FOTOĞRAF (Son Çare) ===
    print(f"🖼️ İki API de '{yemek_adi}' için görsel bulamadı, varsayılan tabak kullanılıyor.")
    return varsayilan_foto
def piti_ile_sohbet_et(kullanici_mesaji):
    """Kullanıcının mesajlarına envanterdeki duruma göre AI ile cevap verir."""
    print("🤖 Piti mesajı düşünüyor...")
    
    # Kullanıcının dolabındaki malzemeleri çekiyoruz ki ona göre cevap versin
    malzemeler_listesi = ai_icin_malzeme_listesi_hazirla()
    malzemeler_metni = ", ".join(malzemeler_listesi) if malzemeler_listesi else "temel ev malzemeleri"
    
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    Sen SmartRec projesinin mutfak asistanı Piti'sin. Çok samimi, yardımsever ve enerjik bir karakterin var.
    Kullanıcının sana yazdığı mesaj: "{kullanici_mesaji}"
    Kullanıcının mutfak dolabındaki mevcut malzemeler: {malzemeler_metni}
    
    Görev: Kullanıcının mesajına bir mutfak asistanı olarak cevap ver. Eğer yemek veya tarif soruyorsa dolabındaki malzemeleri göz önünde bulundurarak kısa, net ve samimi bir öneri yap. 
    Cevabını doğrudan ver, JSON formatı veya markdown (kalın/eğik yazı vs.) kullanma, sadece düz metin olsun.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"❌ Piti Sohbet Hatası: {e}")
        return "Şu an mutfakta ufak bir yoğunluk var, birazdan tekrar sorar mısın? 😅"    
def ai_alisveris_listesi_olustur():
    """Dolaptaki malzemelere bakarak yaratıcı ve eksikleri tamamlayan bir liste sunar."""
    print("🛒 AI Alışveriş Listesi için düşünüyor...")
    
    # Dolaptaki ürünleri alıyoruz
    malzemeler_listesi = ai_icin_malzeme_listesi_hazirla()
    malzemeler_metni = ", ".join(malzemeler_listesi) if malzemeler_listesi else "Dolap tamamen boş."
    
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    Sen pratik bir mutfak asistanısın. Kullanıcının dolabındaki mevcut malzemeler şunlar: {malzemeler_metni}
    
    Lütfen bu malzemeleri göz önünde bulundurarak, mutfakta eksik olabilecek, bu malzemeleri tamamlayacak veya temel ihtiyaç olan 4-5 maddelik şık bir alışveriş listesi hazırla. 
    Her maddenin başına içeriğiyle uyumlu bir emoji koy (Örn: "🥛 1 Litre Günlük Süt", "🌶️ Kırmızı Pul Biber").
    
    Cevabını SADECE aşağıdaki JSON formatında ver, dışına hiçbir metin yazma:
    {{
        "liste": ["madde 1", "madde 2", "madde 3"]
    }}
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        data = json.loads(response.text)
        return data.get("liste", ["Hata: Liste çekilemedi."])
    except Exception as e:
        print(f"❌ Alışveriş listesi AI hatası: {e}")
        return ["⚠️ Sistem hatası oluştu.", "Lütfen tekrar deneyin."]     

def miktar_guncelle(urun_ad, degisim):
    """Ürün miktarını artırır veya azaltır. Sıfır olursa siler."""
    try:
        path = dosya_yolu_getir('inventory.json')
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        temiz_ad = veri_temizle(urun_ad)
        mevcut = next((item for item in data.get("envanter", []) if veri_temizle(item["ad"]) == temiz_ad), None)
        
        if mevcut:
            mevcut["miktar"] += degisim
            if mevcut["miktar"] <= 0:
                data["envanter"].remove(mevcut)  # Sıfırlandıysa çöpe at
            
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True, "Güncellendi"
        return False, "Bulunamadı"
    except Exception as e:
        return False, str(e)

def akilli_temizlik_yap():
    """Tarihi geçmiş tüm ürünleri tek seferde dolaptan atar."""
    try:
        path = dosya_yolu_getir('inventory.json')
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        bugun = datetime.now()
        silinenler = []
        kalanlar = []
        
        for item in data.get("envanter", []):
            try:
                skt = datetime.strptime(item["skt"], "%Y-%m-%d")
                if skt < bugun:
                    silinenler.append(item["ad"]) # Bozuk! Çöpe...
                else:
                    kalanlar.append(item) # Sağlam! Dolapta kalsın...
            except:
                kalanlar.append(item)
        
        data["envanter"] = kalanlar
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        return True, silinenler
    except Exception as e:
        return False, []
def bugunku_kaloriyi_getir():
    """Bugün yenilen yemeklerin toplam kalorisini hesaplar."""
    log_dosyasi = dosya_yolu_getir('daily_log.json')
    tarih = datetime.now().strftime("%Y-%m-%d")
    try:
        if not os.path.exists(log_dosyasi):
            with open(log_dosyasi, 'w', encoding='utf-8') as f:
                json.dump({"gunluk_kayitlar": []}, f)
                
        with open(log_dosyasi, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        toplam = sum(item.get("kalori", 0) for item in data.get("gunluk_kayitlar", []) if item.get("tarih") == tarih)
        return toplam
    except Exception as e:
        print(f"Kalori hesaplama hatası: {e}")
        return 0    
    
if __name__ == "__main__":
    # Diyelim ki inventory.json'dan kullanıcının dolabındaki şu ürünleri okuduk:
    kullanici_dolabi = ["kıyma", "soğan", "sarımsak", "domates salçası", "makarna"]
    
    print("Mutfak Envanteri Analiz Ediliyor...")
    final_menu = akilli_menu_olustur(kullanici_dolabi)
    
    print("\n🍽️ OLUŞTURULAN MENÜ VERİSİ (JSON):")
    print(json.dumps(final_menu, indent=4, ensure_ascii=False))

