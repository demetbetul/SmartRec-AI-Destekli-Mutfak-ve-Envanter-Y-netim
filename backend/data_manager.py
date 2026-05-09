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
# data_manager.py dosyasının başındaki yolu böyle güncelle:
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data') # Eğer data klasörü app.py ile aynı yerdeyse
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

# data_manager.py içindeki ilgili kısmı bununla değiştir:

# ─── Dosya yolu ────────────────────────────────────────────────────────────────
# DÜZELTİLDİ: Tek ve doğru tanım. Önceki kodda üç kez tanımlanmıştı;
# Python son tanımı geçerli sayar, ama bu kafa karıştırıcıydı.
def dosya_yolu_getir(dosya_adi, email=None):
    """
    Eğer email verilmişse, dosyayı kişiye özel hale getirir.
    Örn: inventory.json -> inventory_ahmet@gmail.com.json
    recipes.json (genel tarifler) herkese ortaktır, değişmez.
    """
    import os
    
    # Ortak olması gereken (herkese aynı görünen) dosyalar
    ortak_dosyalar = ["recipes.json", "nutrition.json"]
    
    if email and dosya_adi not in ortak_dosyalar:
        isim, uzanti = os.path.splitext(dosya_adi)
        # Mail adresindeki geçersiz karakterleri temizle
        guvenli_email = email.replace('@', '_at_').replace('.', '_')
        dosya_adi = f"{isim}_{guvenli_email}{uzanti}"
        
    yol = os.path.join(DATA_DIR, dosya_adi)
    
    # Eğer bu kişiye özel dosya henüz yoksa, otomatik olarak boş bir tane oluştur
    if not os.path.exists(yol) and dosya_adi not in ortak_dosyalar:
        with open(yol, 'w', encoding='utf-8') as f:
            if "inventory" in dosya_adi:
                json.dump({"envanter": []}, f)
            elif "daily_log" in dosya_adi:
                json.dump({"gunluk_kayitlar": []}, f)
            else:
                json.dump({}, f)
                
    return yol

def veri_dogrula(veri, tip):
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
    if isinstance(metin, str):
        return metin.strip().lower()
    return metin



# 2. Veri yükleme fonksiyonuna user_email ekle
def veriyi_yukle(dosya_adi='recipes.json', user_email=None):
    path = dosya_yolu_getir(dosya_adi, user_email)
    try:
        if not os.path.exists(path):
            return [] if "recipes" in dosya_adi else {"envanter": []}
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except Exception as e:
        logging.error(f"Yükleme hatası ({dosya_adi}): {e}")
        return []

# 3. Envanter ekleme fonksiyonunu güncelle
# ─── Envanter ekleme ───────────────────────────────────────────────────────────
# DÜZELTİLDİ: user_email zorunlu parametre. Eski kodda raf_omru_gun ile
# tuketim_suresi karışıktı; app.py'den gelen tuketim_suresi buraya iletilir.
def envanter_malzeme_ekle(user_email, ad, miktar, birim="Adet",
                          kategori=None, tuketim_suresi=7):
    try:
        raf_omru_gun = int(tuketim_suresi) if tuketim_suresi else 7
        path = dosya_yolu_getir('inventory.json', user_email)
        data = veriyi_yukle('inventory.json', user_email)
        envanter = data.get("envanter", [])
 
        temiz_ad = veri_temizle(ad)
        skt = (datetime.now() + timedelta(days=raf_omru_gun)).strftime("%Y-%m-%d")
 
        mevcut = next(
            (item for item in envanter if veri_temizle(item["ad"]) == temiz_ad),
            None
        )
        if mevcut:
            mevcut["miktar"] += int(miktar)
            mevcut["skt"] = skt
            if kategori:
                mevcut["kategori"] = kategori
        else:
            yeni = {"ad": temiz_ad, "miktar": int(miktar),
                    "birim": birim, "skt": skt}
            if kategori:
                yeni["kategori"] = kategori
            envanter.append(yeni)
 
        data["envanter"] = envanter
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True, f"{temiz_ad} eklendi."
    except Exception as e:
        logging.error(f"Ekleme hatası: {e}")
        return False, str(e)


 
# ─── Tarif filtreleme ──────────────────────────────────────────────────────────
def akilli_tarif_filtrele(etiket=None, zorluk_seviyesi=None):
    try:
        tarifler = veriyi_yukle()
        sonuclar = []
        for tarif in tarifler:
            etiket_ok  = (etiket is None) or (
                etiket.lower() in [veri_temizle(t) for t in tarif.get('etiketler', [])]
            )
            zorluk_ok = (zorluk_seviyesi is None) or (
                veri_temizle(tarif.get('zorluk', '')) == veri_temizle(zorluk_seviyesi)
            )
            if etiket_ok and zorluk_ok:
                sonuclar.append(tarif)
        return sonuclar
    except Exception as e:
        logging.error(f"Filtreleme hatası: {e}")
        return []


def skt_kontrol(urun_tarihi):
    bugun = datetime.now()
    skt   = datetime.strptime(urun_tarihi, "%Y-%m-%d")
    return "⚠️ BOZULMUŞ!" if skt < bugun else "✅ Taze"
 



# ─── Eksik malzemeleri bul ─────────────────────────────────────────────────────
# DÜZELTİLDİ: user_email parametresi eklendi.
def eksik_malzemeleri_bul(tarif_id, user_email):
    try:
        tarifler      = veriyi_yukle()
        envanter_path = dosya_yolu_getir('inventory.json', user_email)
        with open(envanter_path, 'r', encoding='utf-8') as f:
            envanter_verisi = json.load(f)["envanter"]
 
        secilen_tarif = next(
            (t for t in tarifler if t.get("id") == tarif_id), None
        )
        if not secilen_tarif:
            return []
 
        evdeki = [veri_temizle(item["ad"]) for item in envanter_verisi]
        eksikler = [
            m for m in secilen_tarif.get("malzemeler", [])
            if veri_temizle(m) not in evdeki
        ]
        return eksikler
    except Exception as e:
        logging.error(f"Eksik malzeme hatası: {e}")
        return []
    
# ─── AI için malzeme listesi ───────────────────────────────────────────────────
# DÜZELTİLDİ: user_email parametresi eklendi.
def ai_icin_malzeme_listesi_hazirla(user_email=None):
    try:
        path = dosya_yolu_getir('inventory.json', user_email)
        with open(path, 'r', encoding='utf-8') as f:
            envanter_data = json.load(f)
        return [veri_temizle(item["ad"])
                for item in envanter_data.get("envanter", [])]
    except Exception as e:
        logging.error(f"AI malzeme listesi hatası: {e}")
        return []
    
# ─── Günlük kalori kaydı ───────────────────────────────────────────────────────
# DÜZELTİLDİ: user_email parametresi eklendi.
def yemeği_gunluge_kaydet(yemek_adi, toplam_kalori, user_email=None):
    log_dosyasi = dosya_yolu_getir('daily_log.json', user_email)
    tarih = datetime.now().strftime("%Y-%m-%d")
    try:
        if not os.path.exists(log_dosyasi):
            with open(log_dosyasi, 'w', encoding='utf-8') as f:
                json.dump({"gunluk_kayitlar": []}, f)
 
        with open(log_dosyasi, 'r', encoding='utf-8') as f:
            data = json.load(f)
 
        data["gunluk_kayitlar"].append({
            "tarih": tarih,
            "yemek": yemek_adi,
            "kalori": toplam_kalori
        })
 
        with open(log_dosyasi, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ {yemek_adi} günlüğe kaydedildi.")
    except Exception as e:
        print(f"❌ Günlük kaydı hatası: {e}")

# ─── Envanter güncelleme (yemek yapıldığında) ─────────────────────────────────
# DÜZELTİLDİ: user_email parametresi eklendi.
def envanter_guncelle(yemek_adi, user_email):
    try:
        tarifler     = veriyi_yukle()
        envanter_path = dosya_yolu_getir('inventory.json', user_email)
        with open(envanter_path, 'r', encoding='utf-8') as f:
            envanter_data = json.load(f)
 
        secilen_tarif = next(
            (t for t in tarifler if t["ad"].lower() == yemek_adi.lower()), None
        )
        if secilen_tarif:
            for malzeme in secilen_tarif["malzemeler"]:
                for stok in envanter_data["envanter"]:
                    if veri_temizle(stok["ad"]) == veri_temizle(malzeme):
                        stok["miktar"] = max(0, stok["miktar"] - 1)
 
            with open(envanter_path, 'w', encoding='utf-8') as f:
                json.dump(envanter_data, f, ensure_ascii=False, indent=2)
            print(f"✅ {yemek_adi} yapıldı, stoklar düşüldü.")
        else:
            print(f"⚠️ {yemek_adi} tarifi bulunamadı.")
    except Exception as e:
        print(f"❌ Veri güncelleme hatası: {e}")
 
        
# ─── Yedekleme ─────────────────────────────────────────────────────────────────
def veri_yedekle():
    dosyalar      = ['recipes.json', 'inventory.json', 'nutrition.json']
    zaman_damgasi = datetime.now().strftime("%Y%m%d_%H%M%S")
    try:
        for dosya in dosyalar:
            kaynak = dosya_yolu_getir(dosya)
            if os.path.exists(kaynak):
                yedek_adi = f"{dosya.split('.')[0]}_{zaman_damgasi}.json"
                shutil.copy2(kaynak, os.path.join(BACKUP_DIR, yedek_adi))
        print(f"🛡️ Veriler '{zaman_damgasi}' etiketiyle yedeklendi.")
    except Exception as e:
        logging.error(f"Yedekleme hatası: {e}")
        print("⚠️ Yedekleme sırasında hata oluştu, loglara bakın.")
        
# ─── Envanter istatistikleri ───────────────────────────────────────────────────
# DÜZELTİLDİ: user_email parametresi eklendi.
def envanter_istatistikleri(user_email):
    try:
        path = dosya_yolu_getir('inventory.json', user_email)
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
 
        envanter = data.get("envanter", [])
        bugun    = datetime.now()
 
        kritik_stok    = [i["ad"] for i in envanter if i["miktar"] <= 2]
        bozulmus = []
        for i in envanter:
            try:
                if datetime.strptime(i["skt"], "%Y-%m-%d") <= bugun:
                    bozulmus.append(i["ad"])
            except Exception:
                pass
 
        print("\n📊 VERİ ANALİZ RAPORU")
        print(f"🔹 Toplam Çeşit: {len(envanter)}")
        print(f"⚠️ Kritik Stok: {', '.join(kritik_stok) or 'Yok'}")
        print(f"❌ Tarihi Geçmiş: {', '.join(bozulmus) or 'Hepsi Taze ✨'}")
        print("-" * 30)
    except Exception as e:
        logging.error(f"SKT Analiz hatası: {e}")
 


def get_recipes_from_gemini(malzemeler_metni):
    model  = genai.GenerativeModel('gemini-2.5-flash')
    prompt = f"""
    Sen profesyonel bir aşçısın. Elimdeki şu malzemeleri kullanarak bana BİRBİRİNDEN FARKLI 3 ADET MENÜ ALTERNATİFİ öner: {malzemeler_metni}.
    
    Her menü alternatifinde başlangıç, ana yemek ve tatlı KESİNLİKLE olmalıdır. 
    Ayrıca her menü için evde eksik olan tahmini 3-4 malzemeyi 'eksik_malzemeler' olarak belirt, bu menünün genel yapım zorluğunu (Kolay, Orta veya Zor) 'zorluk' olarak ekle ve tüm menünün tahmini toplam hazırlanma süresini (Örn: "45 dk", "1 saat 15 dk") 'hazirlik_suresi' olarak belirt.
    
    Yanıtı SADECE aşağıdaki JSON formatında ver, dışına hiçbir metin veya açıklama yazma:
    {{
        "kaynak": "gemini",
        "menuler": [
            {{"id": 1, "baslangic": "...", "ana_yemek": "...", "tatli": "...",
              "zorluk": "Orta", "hazirlik_suresi": "55 dk", "eksik_malzemeler": []}},
            {{"id": 2, "baslangic": "...", "ana_yemek": "...", "tatli": "...",
              "zorluk": "Kolay", "hazirlik_suresi": "30 dk", "eksik_malzemeler": []}},
            {{"id": 3, "baslangic": "...", "ana_yemek": "...", "tatli": "...",
              "zorluk": "Zor", "hazirlik_suresi": "90 dk", "eksik_malzemeler": []}}
        ]
    }}
    """
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(response_mime_type="application/json")
    )
    return json.loads(response.text)

def get_recipes_from_spoonacular(malzemeler_metni):
    print("🌍 Türkçe malzemeler İngilizceye çevriliyor...")
    try:
        ingilizce = GoogleTranslator(source='tr', target='en').translate(malzemeler_metni)
    except Exception as e:
        print(f"❌ Çeviri hatası: {e}")
        ingilizce = malzemeler_metni
 
    url    = "https://api.spoonacular.com/recipes/findByIngredients"
    params = {"ingredients": ingilizce, "number": 9, "apiKey": SPOONACULAR_API_KEY}
    data   = requests.get(url, params=params).json()
 
    menuler = []
    for i in range(3):
        menuler.append({
            "id": i + 1,
            "baslangic": data[i*3]["title"]   if len(data) > i*3   else "Tarif bulunamadı",
            "ana_yemek": data[i*3+1]["title"] if len(data) > i*3+1 else "Tarif bulunamadı",
            "tatli":     data[i*3+2]["title"] if len(data) > i*3+2 else "Tarif bulunamadı",
            "eksik_malzemeler": ["Bilinmiyor (Spoonacular)"]
        })
    return {"kaynak": "spoonacular", "menuler": menuler}

def get_recipes_from_local(malzemeler_listesi):
    print("📂 API'ler çöktü, yerel recipes.json'a başvuruluyor...")
    tum_tarifler = veriyi_yukle()
    if not tum_tarifler:
        return {"kaynak": "yerel_veritabani_hata", "menuler": [
            {"id": 1, "baslangic": "Hazır Çorba", "ana_yemek": "Makarna",
             "tatli": "Meyve", "eksik_malzemeler": []}
        ]}
 
    cekilecek = min(9, len(tum_tarifler))
    secilenler = random.sample(tum_tarifler, cekilecek)
    menuler = []
    for i in range(3):
        b = i * 3
        menuler.append({
            "id": i + 1,
            "baslangic": secilenler[b].get("ad", "Çorba")     if len(secilenler) > b   else "Günün Çorbası",
            "ana_yemek": secilenler[b+1].get("ad", "Yemek")   if len(secilenler) > b+1 else "Günün Yemeği",
            "tatli":     secilenler[b+2].get("ad", "Tatlı")   if len(secilenler) > b+2 else "Günün Tatlısı",
            "eksik_malzemeler": ["Bilinmiyor (Yerel Veri)"]
        })
    return {"kaynak": "yerel_veritabani", "menuler": menuler}
 

def gemini_kalori_tahmini(yemek_adi):
    try:
        model  = genai.GenerativeModel('gemini-2.5-flash')
        prompt = f"Sen bir beslenme uzmanısın. '{yemek_adi}' adlı yemeğin ortalama 1 porsiyon kalorisini tahmin et. Yanıtın SADECE sayı ve 'kcal' kelimesinden oluşsun. (Örnek: 350 kcal)"
        return model.generate_content(prompt).text.strip()
    except Exception as e:
        print(f"❌ Gemini Kalori Hatası: {e}")
        return "0 kcal"

def kalori_hesapla(yemek_adi):
    """Sisteme zaten bağlı olan Spoonacular API ile kalori hesaplar, bulamazsa Gemini'ye sorar."""
    print(f"📊 '{yemek_adi}' için kalori hesaplanıyor (Spoonacular)...")
    
    # 1. Yemek adını İngilizceye çevir
    try:
        ingilizce_yemek = GoogleTranslator(source='tr', target='en').translate(yemek_adi)
    except:
        ingilizce_yemek = yemek_adi 
        
    # 2. Spoonacular'a İstek At
    url = "https://api.spoonacular.com/recipes/guessNutrition"
    params = {
        "title": ingilizce_yemek,
        "apiKey": SPOONACULAR_API_KEY
    }
    
    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            data = response.json()
            kalori_degeri = data.get('calories', {}).get('value', 0)
            
            # Spoonacular başarıyla bulduysa onu döndür
            if kalori_degeri > 0:
                return f"{int(kalori_degeri)} kcal"
                
        # Eğer Spoonacular bulamadıysa veya 0 döndüyse Gemini'ye devret
        print(f"⚠️ Spoonacular '{yemek_adi}' için kalori bulamadı. Gemini (AI) devrede!")
        return gemini_kalori_tahmini(yemek_adi)
        
    except Exception as e:
        # Eğer internet koparsa veya Spoonacular çökerse yine Gemini'ye devret
        print(f"⚠️ Spoonacular bağlantı hatası: {e}. Gemini (AI) devrede!")
        return gemini_kalori_tahmini(yemek_adi)

def akilli_menu_olustur(malzemeler_listesi):
    """Sistemin ana köprüsü. 3 farklı menüyü ve kalorileri tek bir JSON'da birleştirir."""
    malzemeler_metni = ", ".join(malzemeler_listesi)
    
    # 1. PLAN: GEMINI AI
    try:
        sonuc = get_recipes_from_gemini(malzemeler_metni)
    except Exception as e:
        print(f"⚠️ Gemini çöktü: {e}")
        try:
            sonuc = get_recipes_from_spoonacular(malzemeler_metni)
        except Exception as e2:
            print(f"❌ Spoonacular da çöktü: {e2}")
            sonuc = get_recipes_from_local(malzemeler_listesi)
 
    for menu in sonuc.get("menuler", []):
        menu["kaloriler"] = {
            "baslangic_kalori": kalori_hesapla(menu["baslangic"]),
            "ana_yemek_kalori": kalori_hesapla(menu["ana_yemek"]),
            "tatli_kalori":     kalori_hesapla(menu["tatli"])
        }
        menu["gorseller"] = {
            "baslangic_foto": yemek_fotografi_bul(menu["baslangic"]),
            "ana_yemek_foto": yemek_fotografi_bul(menu["ana_yemek"]),
            "tatli_foto":     yemek_fotografi_bul(menu["tatli"])
        }
    return sonuc

# ─── Rastgele chatbot tarifi ───────────────────────────────────────────────────
# DÜZELTİLDİ: user_email parametresi eklendi.
def rastgele_chatbot_tarifi(user_email):
    envanter_listesi = ai_icin_malzeme_listesi_hazirla(user_email)
    malzemeler_metni = (", ".join(envanter_listesi)
                        if envanter_listesi else "temel ev malzemeleri")
 
    model  = genai.GenerativeModel('gemini-2.5-flash')
    prompt = f"""
    Sen enerjik, esprili ve samimi bir yapay zeka mutfak şefisin.
    Kullanıcının dolabındaki malzemeler: {malzemeler_metni}
 
    Elindeki malzemelerle yapılabilecek sürpriz tek tabaklık bir tarif öner.
    Cevabını SADECE JSON formatında ver:
    {{
        "chatbot_giris_mesaji": "Selam! ...",
        "tarif_adi": "Yemeğin Adı",
        "hazirlik_suresi": "25 dakika",
        "malzemeler": ["malzeme 1", "malzeme 2"],
        "adimlar": ["1. Adım.", "2. Adım."]
    }}
    """
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        return json.loads(response.text)
    except Exception as e:
        logging.error(f"Chatbot tarif hatası: {e}")
        return {
            "chatbot_giris_mesaji": "Mutfakta ufak bir kaza oldu, tarif defterimi bulamıyorum!",
            "tarif_adi": "Sistem Hatası", "hazirlik_suresi": "?",
            "malzemeler": [], "adimlar": []
        }
    
# ─── AI tarif detayı ──────────────────────────────────────────────────────────
# DÜZELTİLDİ: user_email parametresi eklendi.
def ai_tarif_detayi_getir(yemek_adi, user_email=None):
    envanter_listesi = ai_icin_malzeme_listesi_hazirla(user_email)
    malzemeler_metni = (", ".join(envanter_listesi)
                        if envanter_listesi else "temel ev malzemeleri")
 
    model  = genai.GenerativeModel('gemini-2.5-flash')
    prompt = f"""
    Sen profesyonel bir şefsin. Kullanıcı "{yemek_adi}" yapmak istiyor.
    Dolaptaki malzemeler: {malzemeler_metni}.
 
    Yanıtı SADECE JSON formatında ver:
    {{
        "yemek_adi": "{yemek_adi}",
        "hazirlik_suresi": "35 Dakika",
        "porsiyon": "2 Kişilik",
        "kullanilan_malzemeler": ["malzeme 1"],
        "adimlar": ["1. Adım...", "2. Adım..."]
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
            "yemek_adi": yemek_adi, "hazirlik_suresi": "?",
            "porsiyon": "?", "kullanilan_malzemeler": [],
            "adimlar": ["Tarif yüklenirken hata oluştu, lütfen tekrar tıklayın."]
        }
 
 
    
# ─── Akıllı envanter analizi ──────────────────────────────────────────────────
# DÜZELTİLDİ: user_email parametresi eklendi.
def akilli_envanter_analizi(user_email):
    try:
        path = dosya_yolu_getir('inventory.json', user_email)
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
 
        envanter = data.get("envanter", [])
        if not envanter:
            return {
                "durum": "iyi",
                "ai_mesaji": "Dolabın tertemiz (çünkü bomboş)! Alışveriş zamanı.",
                "kurtarilacak_urunler": []
            }
 
        ozet     = [{"ad": u.get("ad"), "skt": u.get("skt")}
                    for u in envanter if u.get("ad") and u.get("skt")]
        bugun    = datetime.now().strftime("%Y-%m-%d")
        model    = genai.GenerativeModel('gemini-2.5-flash')
        prompt   = f"""
        Sen sevimli bir mutfak asistanısın. Bugünün tarihi: {bugun}.
        Dolaptaki ürünler ve SKT'leri: {ozet}
 
        Tarihi geçmiş veya 1-3 gün kalmış ürünleri tespit et.
        Yanıtı SADECE JSON formatında ver:
        {{
            "durum": "kritik",
            "ai_mesaji": "Samimi bildirim mesajın",
            "kurtarilacak_urunler": ["urun1", "urun2"]
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
            "ai_mesaji": "Sistemde ufak bir yavaşlık var, tarihleri kendin kontrol et!",
            "kurtarilacak_urunler": []
        }

# ─── Seçili malzemelerle tek tarif ────────────────────────────────────────────
def secili_malzemelerle_tek_tarif(secilen_malzemeler):
    malzemeler_metni = ", ".join(secilen_malzemeler)
    model  = genai.GenerativeModel('gemini-2.5-flash')
    prompt = f"""
    Sen usta bir şefsin. Kullanıcı şu malzemeleri verdi: {malzemeler_metni}.
    Bu malzemeleri başrolde kullanarak tek bir yemek tarifi oluştur.
    Yanıtı SADECE JSON formatında ver:
    {{
        "yemek_adi": "Tarif Adı",
        "hazirlik_suresi": "30 Dakika",
        "porsiyon": "2 Kişilik",
        "kullanilan_ana_malzemeler": ["{malzemeler_metni}"],
        "eklenen_temel_malzemeler": ["Zeytinyağı", "Tuz"],
        "adimlar": ["1. Adım...", "2. Adım..."],
        "puf_noktasi": "Lezzet sırrı..."
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
            "yemek_adi": "Yaratıcı Tarif Bulunamadı", "hazirlik_suresi": "?",
            "adimlar": ["Lütfen tekrar deneyin."], "puf_noktasi": ""
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
    varsayilan = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    try:
        ingilizce = GoogleTranslator(source='tr', target='en').translate(yemek_adi)
        url    = "https://api.spoonacular.com/recipes/complexSearch"
        params = {"query": ingilizce, "number": 1, "apiKey": SPOONACULAR_API_KEY}
        res    = requests.get(url, params=params)
        if res.status_code == 200:
            results = res.json().get("results", [])
            if results:
                return results[0]["image"]
    except Exception as e:
        print(f"⚠️ Spoonacular görsel hatası: {e}")
 
    try:
        GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
        GOOGLE_CX      = os.getenv("GOOGLE_CX")
        if GOOGLE_API_KEY and GOOGLE_CX:
            g_res = requests.get("https://www.googleapis.com/customsearch/v1", params={
                "q": yemek_adi + " tarifi", "cx": GOOGLE_CX,
                "key": GOOGLE_API_KEY, "searchType": "image", "num": 1
            })
            if g_res.status_code == 200:
                items = g_res.json().get("items", [])
                if items:
                    return items[0]["link"]
    except Exception as e:
        print(f"⚠️ Google görsel hatası: {e}")
 
    return varsayilan

def remzi_ile_sohbet_et(kullanici_mesaji, user_email=None):
    malzemeler_listesi = ai_icin_malzeme_listesi_hazirla(user_email)
    malzemeler_metni   = (", ".join(malzemeler_listesi)
                          if malzemeler_listesi else "temel ev malzemeleri")
 
    model  = genai.GenerativeModel('gemini-2.5-flash')
    prompt = f"""
    Sen SmartRec'in mutfak asistanı Remzi'sin. Samimi, yardımsever ve enerjik bir karakterin var.
    Kullanıcının mesajı: "{kullanici_mesaji}"
    Kullanıcının dolabındaki malzemeler: {malzemeler_metni}
 
    Bir mutfak asistanı olarak cevap ver. Düz metin kullan, JSON veya markdown kullanma.
    """
    try:
        return model.generate_content(prompt).text
    except Exception as e:
        print(f"❌ Remzi Sohbet Hatası: {e}")
        return "Şu an mutfakta ufak bir yoğunluk var, birazdan tekrar sorar mısın? 😅"
    
    
# ─── AI alışveriş listesi ─────────────────────────────────────────────────────
# DÜZELTİLDİ: user_email parametresi eklendi.
def ai_alisveris_listesi_olustur(user_email=None):
    malzemeler_listesi = ai_icin_malzeme_listesi_hazirla(user_email)
    malzemeler_metni   = (", ".join(malzemeler_listesi)
                          if malzemeler_listesi else "Dolap tamamen boş.")
 
    model  = genai.GenerativeModel('gemini-2.5-flash')
    prompt = f"""
    Sen pratik bir mutfak asistanısın. Dolaptaki malzemeler: {malzemeler_metni}
    Eksik veya tamamlayıcı 4-5 maddelik alışveriş listesi hazırla (emoji ile).
    Yanıtı SADECE JSON formatında ver:
    {{"liste": ["🥛 1 Litre Süt", "🌶️ Kırmızı Pul Biber"]}}
    """
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        return json.loads(response.text).get("liste", [])
    except Exception as e:
        print(f"❌ Alışveriş listesi AI hatası: {e}")
        return ["⚠️ Sistem hatası oluştu.", "Lütfen tekrar deneyin."]
    
# DÜZELTİLDİ: "enventer" → "envanter" anahtar hatası düzeltildi.
def miktar_guncelle(user_email, urun_ad, degisim):
    try:
        path = dosya_yolu_getir('inventory.json', user_email)
        data = veriyi_yukle('inventory.json', user_email)
        envanter = data.get("envanter", [])  # ← Düzeltildi: enventer → envanter
 
        temiz_ad = veri_temizle(urun_ad)
        mevcut = next(
            (item for item in envanter if veri_temizle(item["ad"]) == temiz_ad),
            None
        )
        if mevcut:
            mevcut["miktar"] += degisim
            if mevcut["miktar"] <= 0:
                envanter.remove(mevcut)
            data["envanter"] = envanter
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True, "Güncellendi"
        return False, "Ürün bulunamadı"
    except Exception as e:
        return False, str(e)
 
 

# ─── Akıllı temizlik ───────────────────────────────────────────────────────────
# DÜZELTİLDİ: "enventer" → "envanter" anahtar hatası düzeltildi.
def akilli_temizlik_yap(user_email):
    try:
        path = dosya_yolu_getir('inventory.json', user_email)
        data = veriyi_yukle('inventory.json', user_email)
 
        bugun    = datetime.now()
        kalanlar = []
        silinenler = []
 
        for item in data.get("envanter", []):  # ← Düzeltildi
            try:
                skt = datetime.strptime(item["skt"], "%Y-%m-%d")
                if skt < bugun:
                    silinenler.append(item["ad"])
                else:
                    kalanlar.append(item)
            except Exception:
                kalanlar.append(item)
 
        data["envanter"] = kalanlar
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True, silinenler
    except Exception as e:
        return False, []
    
def bugunku_kaloriyi_getir(user_email=None):
    log_dosyasi = dosya_yolu_getir('daily_log.json', user_email)
    tarih = datetime.now().strftime("%Y-%m-%d")
    try:
        if not os.path.exists(log_dosyasi):
            with open(log_dosyasi, 'w', encoding='utf-8') as f:
                json.dump({"gunluk_kayitlar": []}, f)
 
        with open(log_dosyasi, 'r', encoding='utf-8') as f:
            data = json.load(f)
 
        return sum(
            item.get("kalori", 0)
            for item in data.get("gunluk_kayitlar", [])
            if item.get("tarih") == tarih
        )
    except Exception as e:
        print(f"Kalori hesaplama hatası: {e}")
        return 0
    
# data_manager.py dosyasının en altına ekle:

# ─── Sıfır ekstra malzemeli öneri ─────────────────────────────────────────────
# DÜZELTİLDİ: user_email parametresi eklendi.
def sifir_ekstra_malzemeli_oneri(user_email=None):
    malzemeler_listesi = ai_icin_malzeme_listesi_hazirla(user_email)
    if not malzemeler_listesi:
        return []
 
    malzemeler_metni = ", ".join(malzemeler_listesi)
    model  = genai.GenerativeModel('gemini-2.5-flash')
    prompt = f"""
    Sen pratik bir şefsin. Kullanıcının KESİNLİKLE şu malzemeleri var: {malzemeler_metni}.
    Dışarıdan ekstra malzeme gerektirmeyen 2 farklı tarif öner.
    Yanıtı SADECE JSON formatında ver:
    [
        {{"title": "Tarif 1", "tagLabels": ["ANA YEMEK"], "time": "20 dk", "calories": 350}},
        {{"title": "Tarif 2", "tagLabels": ["ATIŞTIRMALIK"], "time": "15 dk", "calories": 200}}
    ]
    """
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        tarifler = json.loads(response.text)
        for t in tarifler:
            t["image"] = yemek_fotografi_bul(t["title"])
        return tarifler
    except Exception as e:
        print(f"❌ Sıfır Ekstra Malzeme Hatası: {e}")
        return []
    
if __name__ == "__main__":
    # Diyelim ki inventory.json'dan kullanıcının dolabındaki şu ürünleri okuduk:
    kullanici_dolabi = ["kıyma", "soğan", "sarımsak", "domates salçası", "makarna"]
    
    print("Mutfak Envanteri Analiz Ediliyor...")
    final_menu = akilli_menu_olustur(kullanici_dolabi)
    
    print("\n🍽️ OLUŞTURULAN MENÜ VERİSİ (JSON):")
    print(json.dumps(final_menu, indent=4, ensure_ascii=False))