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

# ─── Ortam değişkenleri ────────────────────────────────────────────────────────
load_dotenv()
GEMINI_API_KEY      = os.getenv("GEMINI_API_KEY")
SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")
NUTRITION_API_KEY   = os.getenv("NUTRITION_API_KEY")

if not GEMINI_API_KEY:
    logging.warning("⚠️ GEMINI_API_KEY not found in .env file")
if not SPOONACULAR_API_KEY:
    logging.warning("⚠️ SPOONACULAR_API_KEY not found in .env file")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ─── Merkezi dizin tanımları ───────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(BASE_DIR, 'data')          
BACKUP_DIR = os.path.join(BASE_DIR, '..', 'backups')

os.makedirs(DATA_DIR,   exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)

logging.basicConfig(
    filename=os.path.join(BASE_DIR, '..', 'app.log'),
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s',
    encoding='utf-8'
)

# ─── Dosya şablonları ──────────────────────────────────────────────────────────
DOSYA_SABLONLARI = {
    "inventory.json":  {"envanterler": {}},    
    "daily_log.json":  {"gunluk_kayitlar": {}}, 
    "recipes.json":    [],
    "nutrition.json":  {},
}

# ─────────────────────────────────────────────────────────────────────────────
# — Fail-Safe: Dosya garantisi
# ─────────────────────────────────────────────────────────────────────────────
def dosyayi_garantile(dosya_adi: str) -> str:
    """
    DATA_DIR içindeki dosyanın tam yolunu döndürür.
    Dosya yoksa boş şablonunu otomatik oluşturur (fail-safe).
    """
    yol = os.path.join(DATA_DIR, dosya_adi)
    if not os.path.exists(yol):
        sablon = DOSYA_SABLONLARI.get(dosya_adi, {})
        with open(yol, 'w', encoding='utf-8') as f:
            json.dump(sablon, f, ensure_ascii=False, indent=2)
    return yol

# ─────────────────────────────────────────────────────────────────────────────
# — DRY: Merkezi JSON okuma / yazma yardımcıları
# ─────────────────────────────────────────────────────────────────────────────
def load_json(dosya_adi: str) -> dict:
    """Dosyayı garantileyip içeriğini döndürür."""
    yol = dosyayi_garantile(dosya_adi)
    try:
        with open(yol, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"load_json hatası ({dosya_adi}): {e}")
        return DOSYA_SABLONLARI.get(dosya_adi, {})

def save_json(dosya_adi: str, veri) -> bool:
    """Veriyi DATA_DIR içindeki dosyaya yazar."""
    yol = dosyayi_garantile(dosya_adi)
    try:
        with open(yol, 'w', encoding='utf-8') as f:
            json.dump(veri, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logging.error(f"save_json hatası ({dosya_adi}): {e}")
        return False

# ─────────────────────────────────────────────────────────────────────────────
# YEDEKLEMEYİ PASSİFLEŞTİR — Akıllı yedekleme sistemi
#
# Eski davranış : veri_yedekle() her yerden elle çağrılıyordu; her işlemde
#                 her dosya için sınırsız yedek birikiyordu.
#
# Yeni davranış : _kritik_yedek_al() yalnızca geri-alınamaz işlemler öncesinde
#                 (envanter temizliği gibi) bu modül içinden otomatik tetiklenir.
#                 Her dosya için en fazla MAX_YEDEK_SAYISI yedek tutulur;
#                 eskiler otomatik silinir.
# ─────────────────────────────────────────────────────────────────────────────
MAX_YEDEK_SAYISI = 3  

def _kritik_yedek_al(dosya_adi: str) -> None:
    """
    Tek bir dosyanın yedeğini alır ve BACKUP_DIR içinde en fazla
    MAX_YEDEK_SAYISI yedek kalacak şekilde eskilerini temizler.

    KULLANIM: Yalnızca bu modül içinden, geri-alınamaz işlemler öncesinde
    çağrılır (örn. akilli_temizlik_yap). Dışarıdan doğrudan çağrılmaz.
    """
    kaynak = dosyayi_garantile(dosya_adi)
    if not os.path.exists(kaynak):
        return
    try:
        zaman_damgasi = datetime.now().strftime("%Y%m%d_%H%M%S")
        kok           = dosya_adi.split('.')[0]           
        yedek_adi     = f"{kok}_{zaman_damgasi}.json"
        shutil.copy2(kaynak, os.path.join(BACKUP_DIR, yedek_adi))

        tum_yedekler = sorted(
            f for f in os.listdir(BACKUP_DIR)
            if f.startswith(kok + "_") and f.endswith(".json")
        )
        for eski in tum_yedekler[:max(0, len(tum_yedekler) - MAX_YEDEK_SAYISI)]:
            os.remove(os.path.join(BACKUP_DIR, eski))

        logging.info(f"Kritik yedek alındı: {yedek_adi}")
    except Exception as e:
        logging.error(f"Yedekleme hatası ({dosya_adi}): {e}")

def veri_yedekle():
    """
    Manuel / harici çağrılar için korunan genel yedekleme fonksiyonu.
    Her dosya için MAX_YEDEK_SAYISI (={max}) kuralına uyar; eski yedekler silinir.

    !! Rutin işlemlerde (malzeme ekleme, log kaydetme vb.) ÇAĞRILMAZ. !!
    Yalnızca admin paneli, bakım modu veya kritik batch senaryolarında
    bilinçli olarak tetiklenmelidir.
    """.format(max=MAX_YEDEK_SAYISI)
    dosyalar = ['recipes.json', 'inventory.json', 'nutrition.json', 'daily_log.json']
    for dosya in dosyalar:
        _kritik_yedek_al(dosya)
    print(f"🛡️ Manuel yedekleme tamamlandı. (Maks. {MAX_YEDEK_SAYISI} yedek/dosya)")

# ─────────────────────────────────────────────────────────────────────────────
#  Merkezi kullanıcı envanter/log erişimi
# ─────────────────────────────────────────────────────────────────────────────
def kullanici_envanterini_getir(user_email: str) -> list:
    """inventory.json içinden tek kullanıcının listesini döndürür."""
    data = load_json("inventory.json")
    return data.get("envanterler", {}).get(user_email, [])

def kullanici_envanterini_kaydet(user_email: str, envanter: list) -> bool:
    """inventory.json içinde tek kullanıcının listesini günceller."""
    data = load_json("inventory.json")
    data.setdefault("envanterler", {})[user_email] = envanter
    return save_json("inventory.json", data)

def kullanici_logunu_getir(user_email: str) -> list:
    """daily_log.json içinden tek kullanıcının kayıtlarını döndürür."""
    data = load_json("daily_log.json")
    return data.get("gunluk_kayitlar", {}).get(user_email, [])

def kullanici_logunu_kaydet(user_email: str, kayitlar: list) -> bool:
    """daily_log.json içinde tek kullanıcının kayıtlarını günceller."""
    data = load_json("daily_log.json")
    data.setdefault("gunluk_kayitlar", {})[user_email] = kayitlar
    return save_json("daily_log.json", data)

# ─── Doğrulama ve temizlik ────────────────────────────────────────────────────
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

# ─── Genel veri yükleme (geriye dönük uyumluluk) ─────────────────────────────
def veriyi_yukle(dosya_adi='recipes.json', user_email=None):
    """
    recipes.json / nutrition.json gibi ortak dosyalar için kullanılır.
    recipes.json {"tarifler": [...]} veya düz [...] yapısında olabilir;
    her iki durumda da düz liste döndürür.
    Kullanıcıya özel veriler için kullanici_envanterini_getir() tercih edin.
    """
    try:
        ham = load_json(dosya_adi)
        if 'recipes' in dosya_adi:
            if isinstance(ham, dict):
                return ham.get('tarifler', [])
            elif isinstance(ham, list):
                return ham
            return []
        return ham
    except Exception as e:
        logging.error(f"Yükleme hatası ({dosya_adi}): {e}")
        return [] if "recipes" in dosya_adi else {}

# ─── Envanter ekleme ──────────────────────────────────────────────────────────
def envanter_malzeme_ekle(user_email, ad, miktar, birim="Adet",
                          kategori=None, tuketim_suresi=7):
    try:
        raf_omru_gun = int(tuketim_suresi) if tuketim_suresi else 7
        envanter     = kullanici_envanterini_getir(user_email)

        temiz_ad = veri_temizle(ad)
        skt      = (datetime.now() + timedelta(days=raf_omru_gun)).strftime("%Y-%m-%d")

        mevcut = next(
            (item for item in envanter if veri_temizle(item["ad"]) == temiz_ad), None
        )
        if mevcut:
            mevcut["miktar"] += int(miktar)
            mevcut["skt"]     = skt
            if kategori:
                mevcut["kategori"] = kategori
        else:
            yeni = {"ad": temiz_ad, "miktar": int(miktar), "birim": birim, "skt": skt}
            if kategori:
                yeni["kategori"] = kategori
            envanter.append(yeni)

        kullanici_envanterini_kaydet(user_email, envanter)
        return True, f"{temiz_ad} eklendi."
    except Exception as e:
        logging.error(f"Ekleme hatası: {e}")
        return False, str(e)

# ─── Tarif filtreleme ─────────────────────────────────────────────────────────
def akilli_tarif_filtrele(etiket=None, zorluk_seviyesi=None):
    try:
        tarifler = veriyi_yukle()
        sonuclar = []
        for tarif in tarifler:
            etiket_ok = (etiket is None) or (
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

# ─── Eksik malzemeleri bul ────────────────────────────────────────────────────
def eksik_malzemeleri_bul(tarif_id, user_email):
    try:
        tarifler        = veriyi_yukle()
        envanter_verisi = kullanici_envanterini_getir(user_email)

        secilen_tarif = next(
            (t for t in tarifler if t.get("id") == tarif_id), None
        )
        if not secilen_tarif:
            return []

        evdeki   = [veri_temizle(item["ad"]) for item in envanter_verisi]
        eksikler = [
            m for m in secilen_tarif.get("malzemeler", [])
            if veri_temizle(m) not in evdeki
        ]
        return eksikler
    except Exception as e:
        logging.error(f"Eksik malzeme hatası: {e}")
        return []

# ─── AI için malzeme listesi ──────────────────────────────────────────────────
def ai_icin_malzeme_listesi_hazirla(user_email=None):
    try:
        envanter = kullanici_envanterini_getir(user_email) if user_email else []
        return [veri_temizle(item["ad"]) for item in envanter]
    except Exception as e:
        logging.error(f"AI malzeme listesi hatası: {e}")
        return []

# ─── Günlük kalori kaydı ──────────────────────────────────────────────────────
def yemeği_gunluge_kaydet(yemek_adi, toplam_kalori, user_email=None):
    tarih = datetime.now().strftime("%Y-%m-%d")
    try:
        kayitlar = kullanici_logunu_getir(user_email) if user_email else []
        kayitlar.append({"tarih": tarih, "yemek": yemek_adi, "kalori": toplam_kalori})
        kullanici_logunu_kaydet(user_email, kayitlar)
        print(f"✅ {yemek_adi} günlüğe kaydedildi.")
    except Exception as e:
        print(f"❌ Günlük kaydı hatası: {e}")

# ─── Envanter güncelleme (yemek yapıldığında) ────────────────────────────────

# ─── Envanter güncelleme (yemek yapıldığında) ────────────────────────────────
# ─── Envanter güncelleme (yemek yapıldığında) ────────────────────────────────
def envanter_guncelle(yemek_adi, user_email, disaridan_malzemeler=None):
    try:
        import re 
        tarifler = veriyi_yukle()
        envanter = kullanici_envanterini_getir(user_email)

        def harf_duzelt(metin):
            return str(metin).lower().replace("ı","i").replace("ş","s").replace("ğ","g").replace("ü","u").replace("ö","o").replace("ç","c").strip()

        print(f"\n[{yemek_adi}] Pişirildi! Envanter kontrolü başlıyor...")
        
        malzemeler_listesi = []

        if disaridan_malzemeler and isinstance(disaridan_malzemeler, list) and len(disaridan_malzemeler) > 0:
            malzemeler_listesi = disaridan_malzemeler
        else:
            hedef_yemek = harf_duzelt(yemek_adi)
            for t in tarifler:
                if harf_duzelt(t.get("ad", "")) == hedef_yemek or harf_duzelt(t.get("title", "")) == hedef_yemek:
                    malzemeler_listesi = t.get("malzemeler", []) or t.get("ingredients", [])
                    break

        if not malzemeler_listesi:
            print("❌ HATA: Malzeme listesi boş!")
            return

        guncellenen = 0
        for malzeme in malzemeler_listesi:
            if isinstance(malzeme, dict):
                malzeme_adi = malzeme.get("isim", "")
                malzeme_birimi = str(malzeme.get("birim", "adet")).lower().strip()
                try:
                    gerekli_miktar = float(malzeme.get("miktar", 1))
                except:
                    gerekli_miktar = 1
            else:
                malzeme_str = str(malzeme).lower().strip()
                match = re.search(r'^(\d+[\.,]?\d*)\s*([a-zA-Zçğıöşü]+)?\s*(.*)', malzeme_str)
                if match:
                    try:
                        gerekli_miktar = float(match.group(1).replace(',', '.'))
                    except:
                        gerekli_miktar = 1
                    malzeme_birimi = match.group(2) if match.group(2) else "adet"
                    sadece_isim = match.group(3).strip()
                    malzeme_adi = sadece_isim if sadece_isim else malzeme_str
                else:
                    gerekli_miktar = 1
                    malzeme_birimi = "adet"
                    malzeme_adi = malzeme_str

            temiz_malzeme = harf_duzelt(malzeme_adi)

            for stok in envanter:
                temiz_stok = harf_duzelt(stok.get("ad", ""))
                
                if temiz_stok in temiz_malzeme or temiz_malzeme in temiz_stok:
                    mevcut_miktar = int(stok.get("miktar", 0))
                    adet_kabul_edilenler = ["adet", "dilim", "diş", "yaprak", "dal", "top", "baş", "demet"]
                    
                    if malzeme_birimi in adet_kabul_edilenler:
                        dusulecek = int(gerekli_miktar)
                    else:
                        if mevcut_miktar > 10 and gerekli_miktar > 10:
                            dusulecek = int(gerekli_miktar)
                        else:
                            dusulecek = 1
                            
                    yeni_miktar = max(0, mevcut_miktar - dusulecek)
                    stok["miktar"] = yeni_miktar
                    guncellenen += 1
                    print(f"    📉 EŞLEŞTİ: {stok.get('ad')} (-{dusulecek} birim) -> Kalan: {yeni_miktar}")
                    break
                    
        if guncellenen > 0:
            kullanici_envanterini_kaydet(user_email, envanter)
            print(f"🎉 İŞLEM BAŞARILI! Toplam {guncellenen} ürün dolaptan eksiltildi.\n")
    except Exception as e:
        print(f"❌ HATA: {e}\n")
# ─── Envanter istatistikleri ─────────────────────────────────────────────────
def envanter_istatistikleri(user_email):
    try:
        envanter = kullanici_envanterini_getir(user_email)
        bugun    = datetime.now()

        kritik_stok = [i["ad"] for i in envanter if i["miktar"] <= 2]
        bozulmus    = []
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

# ─── Akıllı temizlik (KRİTİK işlem — otomatik yedek alır) ───────────────────
def akilli_temizlik_yap(user_email):
    """
    Süresi geçmiş ürünleri envanterden siler.
    Silme geri alınamaz olduğundan işlem öncesinde otomatik kritik yedek alınır.
    Bu, _kritik_yedek_al()'ın tetiklendiği nadir durumlardan biridir.
    """
    try:
        _kritik_yedek_al("inventory.json") 

        envanter   = kullanici_envanterini_getir(user_email)
        bugun      = datetime.now()
        kalanlar   = []
        silinenler = []

        for item in envanter:
            try:
                skt = datetime.strptime(item["skt"], "%Y-%m-%d")
                if skt < bugun:
                    silinenler.append(item["ad"])
                else:
                    kalanlar.append(item)
            except Exception:
                kalanlar.append(item)

        kullanici_envanterini_kaydet(user_email, kalanlar)
        return True, silinenler
    except Exception as e:
        logging.error(f"Temizlik hatası: {e}")
        return False, []

# ─── Günlük kaloriyi getir ────────────────────────────────────────────────────
def bugunku_kaloriyi_getir(user_email=None):
    tarih = datetime.now().strftime("%Y-%m-%d")
    try:
        kayitlar = kullanici_logunu_getir(user_email) if user_email else []
        return sum(
            item.get("kalori", 0)
            for item in kayitlar
            if item.get("tarih") == tarih
        )
    except Exception as e:
        print(f"Kalori hesaplama hatası: {e}")
        return 0

# ─── Miktar güncelle ──────────────────────────────────────────────────────────
def miktar_guncelle(user_email, urun_ad, degisim):
    try:
        envanter = kullanici_envanterini_getir(user_email)
        temiz_ad = veri_temizle(urun_ad)
        mevcut   = next(
            (item for item in envanter if veri_temizle(item["ad"]) == temiz_ad), None
        )
        if mevcut:
            mevcut["miktar"] += degisim
            if mevcut["miktar"] <= 0:
                envanter.remove(mevcut)
            kullanici_envanterini_kaydet(user_email, envanter)
            return True, "Güncellendi"
        return False, "Ürün bulunamadı"
    except Exception as e:
        return False, str(e)

# ─── Gemini / Spoonacular / Yerel tarif üretimi ──────────────────────────────
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

    cekilecek  = min(9, len(tum_tarifler))
    secilenler = random.sample(tum_tarifler, cekilecek)
    menuler    = []
    for i in range(3):
        b = i * 3
        menuler.append({
            "id": i + 1,
            "baslangic": secilenler[b].get("ad", "Çorba")   if len(secilenler) > b   else "Günün Çorbası",
            "ana_yemek": secilenler[b+1].get("ad", "Yemek") if len(secilenler) > b+1 else "Günün Yemeği",
            "tatli":     secilenler[b+2].get("ad", "Tatlı") if len(secilenler) > b+2 else "Günün Tatlısı",
            "eksik_malzemeler": ["Bilinmiyor (Yerel Veri)"]
        })
    return {"kaynak": "yerel_veritabani", "menuler": menuler}

# ─── Kalori hesaplama ─────────────────────────────────────────────────────────
def gemini_kalori_tahmini(yemek_adi):
    try:
        model  = genai.GenerativeModel('gemini-2.5-flash')
        prompt = f"Sen bir beslenme uzmanısın. '{yemek_adi}' adlı yemeğin ortalama 1 porsiyon kalorisini tahmin et. Yanıtın SADECE sayı ve 'kcal' kelimesinden oluşsun. (Örnek: 350 kcal)"
        return model.generate_content(prompt).text.strip()
    except Exception as e:
        print(f"❌ Gemini Kalori Hatası: {e}")
        return "0 kcal"

def kalori_hesapla(yemek_adi):
    """Spoonacular ile kalori hesaplar, bulamazsa Gemini'ye sorar."""
    print(f"📊 '{yemek_adi}' için kalori hesaplanıyor (Spoonacular)...")
    try:
        ingilizce_yemek = GoogleTranslator(source='tr', target='en').translate(yemek_adi)
    except Exception:
        ingilizce_yemek = yemek_adi

    url    = "https://api.spoonacular.com/recipes/guessNutrition"
    params = {"title": ingilizce_yemek, "apiKey": SPOONACULAR_API_KEY}
    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            kalori_degeri = response.json().get('calories', {}).get('value', 0)
            if kalori_degeri > 0:
                return f"{int(kalori_degeri)} kcal"
        print(f"⚠️ Spoonacular '{yemek_adi}' için kalori bulamadı. Gemini devrede!")
        return gemini_kalori_tahmini(yemek_adi)
    except Exception as e:
        print(f"⚠️ Spoonacular bağlantı hatası: {e}. Gemini devrede!")
        return gemini_kalori_tahmini(yemek_adi)

# ─── Akıllı menü oluştur ──────────────────────────────────────────────────────
def akilli_menu_olustur(malzemeler_listesi):
    """Sistemin köprüsü. 3 farklı menüyü ve kalorileri tek bir JSON'da birleştirir."""
    malzemeler_metni = ", ".join(malzemeler_listesi)
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

# ─── Rastgele chatbot tarifi ──────────────────────────────────────────────────
def rastgele_chatbot_tarifi(user_email):
    envanter_listesi = ai_icin_malzeme_listesi_hazirla(user_email)
    malzemeler_metni = ", ".join(envanter_listesi) if envanter_listesi else "temel ev malzemeleri"

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
def ai_tarif_detayi_getir(yemek_adi, user_email=None):
    envanter_listesi = ai_icin_malzeme_listesi_hazirla(user_email)
    malzemeler_metni = ", ".join(envanter_listesi) if envanter_listesi else "temel ev malzemeleri"

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

# ─── Akıllı envanter analizi ─────────────────────────────────────────────────
def akilli_envanter_analizi(user_email):
    try:
        envanter = kullanici_envanterini_getir(user_email)
        if not envanter:
            return {
                "durum": "iyi",
                "ai_mesaji": "Dolabın tertemiz (çünkü bomboş)! Alışveriş zamanı.",
                "kurtarilacak_urunler": []
            }

        ozet   = [{"ad": u.get("ad"), "skt": u.get("skt")}
                  for u in envanter if u.get("ad") and u.get("skt")]
        bugun  = datetime.now().strftime("%Y-%m-%d")
        model  = genai.GenerativeModel('gemini-2.5-flash')
        prompt = f"""
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

# ─── Seçili malzemelerle tek tarif ───────────────────────────────────────────
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

# ─── Alışveriş linkleri ───────────────────────────────────────────────────────
def alisveris_linkleri_olustur(eksik_malzemeler):
    """Eksik malzemeleri Migros Sanal Market arama linklerine dönüştürür."""
    print("🛒 Alışveriş robotu eksikler için sepet linklerini hazırlıyor...")
    linkli_liste = []
    for malzeme in eksik_malzemeler:
        url_uyumlu_isim = urllib.parse.quote(malzeme)
        arama_linki     = f"https://www.migros.com.tr/arama?q={url_uyumlu_isim}"
        linkli_liste.append({"malzeme": malzeme, "satin_al_linki": arama_linki})
    return linkli_liste

# ─── Yemek fotoğrafı bul ─────────────────────────────────────────────────────
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

# ─── Remzi sohbet ─────────────────────────────────────────────────────────────
def remzi_ile_sohbet_et(kullanici_mesaji, user_email=None):
    malzemeler_listesi = ai_icin_malzeme_listesi_hazirla(user_email)
    malzemeler_metni   = ", ".join(malzemeler_listesi) if malzemeler_listesi else "temel ev malzemeleri"

    model  = genai.GenerativeModel('gemini-2.5-flash')
    prompt = f"""
    Senin adın Remzi. SmartRec uygulamasının yapay zeka mutfak asistanı ve şefisin.
    Karakterin: Enerjik, yardımsever, samimi ve iş bitirici.
    Kullanıcının mesajı: "{kullanici_mesaji}"
    Kullanıcının dolabındaki malzemeler: {malzemeler_metni}
    Kurallar:
    Robot gibi "Size nasıl yardımcı olabilirim", "Ben bir yapay zekayım" gibi kalıplar kullanma.
    Kullanıcıya "sen" diye hitap et (siz değil).
    Gerektiğinde yerinde ve dozunda emojiler (🍳, 🔪, 🔥 gibi) kullan ama abartma.
    Eğer yemekle ilgisiz bir şey sorulursa, konuyu esprili bir dille mutfağa veya yemeklere bağla.

    Bir mutfak asistanı olarak cevap ver. Düz metin kullan, JSON veya markdown kullanma.
    """
    try:
        return model.generate_content(prompt).text
    except Exception as e:
        print(f"❌ Remzi Sohbet Hatası: {e}")
        return "Şu an mutfakta ufak bir yoğunluk var, birazdan tekrar sorar mısın? 😅"

# ─── AI alışveriş listesi ─────────────────────────────────────────────────────
def ai_alisveris_listesi_olustur(user_email=None):
    malzemeler_listesi = ai_icin_malzeme_listesi_hazirla(user_email)
    malzemeler_metni   = ", ".join(malzemeler_listesi) if malzemeler_listesi else "Dolap tamamen boş."

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

# ─── Sıfır ekstra malzemeli öneri ────────────────────────────────────────────
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

# ─── Envantere özel AI tarif önerisi (remzi.html sağ kart) ──────────────────
def envanter_icin_ai_tarif_oner(user_email=None):
    malzemeler_listesi = ai_icin_malzeme_listesi_hazirla(user_email)

    if not malzemeler_listesi:
        return []

    malzemeler_metni = ", ".join(malzemeler_listesi)

    model  = genai.GenerativeModel('gemini-2.5-flash')
    prompt = f"""
Sen Türk mutfağı uzmanı bir şefsin. Kullanıcının dolabında şu malzemeler var: {malzemeler_metni}

Bu malzemeleri kullanarak 3 farklı tarif öner: bir ANA YEMEK, bir ÇORBA ve bir TATLI.
Mümkün olduğunca bu malzemeleri kullan ama temel mutfak malzemeleri (tuz, su, yağ vb.) varsayılan olabilir.

Yanıtı SADECE aşağıdaki JSON formatında ver, başka hiçbir metin yazma:
[
  {{
    "title": "Tarif Adı",
    "category": "ana-menu",
    "time": "30 dk",
    "calories": 450,
    "score": "9.2",
    "ingredients": ["malzeme1", "malzeme2"],
    "steps": ["1. Adım...", "2. Adım...", "3. Adım..."] 
  }}
]
"""
    KATEGORI_LABEL = {
        'ana-menu': '🍽️ Ana Yemek',
        'corba':    '🍲 Çorba',
        'tatli':    '🍮 Tatlı',
    }

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        
        import json
        import time
        tarifler = json.loads(response.text)

        result = []
        base_id = int(time.time()) 
        
        for i, t in enumerate(tarifler):
            cat = t.get("category", "ana-menu")
            
            adims = t.get("steps") or t.get("adimlar") or t.get("yapilisi") or t.get("hazirlanis") or ["1. Tüm malzemeleri hazırlayın.", "2. Afiyetle tüketin."]
            
            result.append({
                "id":         -(base_id + i), 
                "title":      t.get("title", "Tarif"),
                "image":      yemek_fotografi_bul(t.get("title", "")),
                "time":       t.get("time", "30 dk"),
                "calories":   t.get("calories", 400),
                "score":      t.get("score", "9.0"),
                "tags":       [cat],
                "tagLabels":  [KATEGORI_LABEL.get(cat, "🍽️ Öneri")],
                "ingredients": t.get("ingredients") or t.get("malzemeler") or [],
                "steps":      adims, 
                "desc":       f"Envanterinize göre AI önerisi"
            })
        return result

    except Exception as e:
        logging.error(f"Envanter AI tarif hatası: {e}")
        return []


# ─── Entry point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    kullanici_dolabi = ["kıyma", "soğan", "sarımsak", "domates salçası", "makarna"]
    print("Mutfak Envanteri Analiz Ediliyor...")
    final_menu = akilli_menu_olustur(kullanici_dolabi)
    print("\n🍽️ OLUŞTURULAN MENÜ VERİSİ (JSON):")
    print(json.dumps(final_menu, indent=4, ensure_ascii=False))