import os
import json
import requests
import google.generativeai as genai

# Diğer dosyamızdaki (data_manager.py) hazır fonksiyonları buraya çağırıyoruz
from data_manager import ai_icin_malzeme_listesi_hazirla, veriyi_yukle

# --- 1. GEMINI API KURULUMU ---
# Buraya kendi API anahtarını tırnak içinde yaz.
GEMINI_API_KEY = "AIzaSyDguxcLzv1aLi3cm95V7E0tbuefuhIjo5Q" 
genai.configure(api_key=GEMINI_API_KEY)

def ai_tarif_uret():
    """
    Evdeki malzemeleri okur, Gemini'ye gönderir ve JSON formatında 3 tarif alır.
    """
    print("🤖 Gemini API'ye bağlanılıyor, malzemeler kontrol ediliyor...")
    
    # data_manager.py'den evdeki malzemeleri çekiyoruz
    malzemeler = ai_icin_malzeme_listesi_hazirla()
    
    if "hata" in malzemeler.lower() or not malzemeler:
        return {"hata": "Malzeme listesi boş veya alınamadı!"}

    model = genai.GenerativeModel('gemini-2.5-flash',
                                  generation_config={"response_mime_type": "application/json"})
    
    prompt = f"""
    Sen uzman bir aşçısın. Amacın mutfaktaki israfı önlemek.
    Elimdeki malzemeler şunlar: {malzemeler}.
    
    Sadece bu malzemeleri (ve tuz, yağ, su gibi temel ev malzemelerini) kullanarak bana 3 farklı tarif öner:
    1 adet Başlangıç
    1 adet Ana Yemek
    1 adet Tatlı
    
    Yanıtını aşağıdaki JSON formatına tam olarak uyarak ver:
    {{
      "tarifler": [
        {{
          "kategori": "Başlangıç",
          "ad": "Yemek Adı",
          "malzemeler": ["malzeme 1", "malzeme 2"],
          "hazirlanis": "Adım adım kısa tarif"
        }}
      ]
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        ai_tarifleri = json.loads(response.text)
        print("✅ Gemini API başarıyla tarifleri üretti!")
        return ai_tarifleri
    except Exception as e:
        return {"hata": f"AI API bağlantı hatası: {e}"}

# --- 2. CANLI API VE FAIL-SAFE KURULUMU ---
def canli_tarif_getir(arama_kelimesi="chicken"):
    """
    TheMealDB API'den canlı veri çeker. Çökerse yerel yedeğe (Fail-Safe) geçer.
    """
    url = f"https://www.themealdb.com/api/json/v1/1/search.php?s={arama_kelimesi}"
    print(f"🌍 Canlı API'den '{arama_kelimesi}' aranıyor...")
    
    try:
        # 5 saniye içinde cevap gelmezse hata ver (sistem donmasın diye)
        response = requests.get(url, timeout=5) 
        
        if response.status_code == 200:
            data = response.json()
            if data['meals']:
                print("✅ Canlı API verisi başarıyla çekildi.")
                return data['meals']
            else:
                print("⚠️ API çalışıyor ama tarif bulunamadı.")
                return []
        else:
            raise Exception(f"API Hata Kodu: {response.status_code}")
            
    except Exception as e:
        # İnternet yoksa veya API çöktüyse bu blok çalışır
        print(f"❌ CANLI API ÇÖKTÜ VEYA İNTERNET YOK! Hata: {e}")
        print("🔄 FAIL-SAFE DEVREDE: Yerel 'data_manager.py' üzerinden tarifler yükleniyor...")
        
        # data_manager.py'deki veriyi_yukle fonksiyonunu kullanıyoruz
        yerel_veriler = veriyi_yukle() 
        return yerel_veriler

# --- 3. TEST ALANI ---
# Bu kod sadece bu dosyayı direkt çalıştırdığında çalışır.
if __name__ == "__main__":
    print("\n" + "="*40)
    print("🚀 API YÖNETİCİSİ TEST BAŞLIYOR")
    print("="*40)
    
    # Canlı API'yi test edelim
    canli_sonuc = canli_tarif_getir()
    if isinstance(canli_sonuc, list) and len(canli_sonuc) > 0:
        print(f"Örnek Canlı Tarif: {canli_sonuc[0].get('strMeal', canli_sonuc[0].get('ad', 'İsimsiz'))}")
    
    print("\n" + "-"*40 + "\n")
    
    # Gemini AI'yi test edelim (API Key girdiysen çalışır)
    ai_sonuc = ai_tarif_uret()
    print("AI Sonucu:\n", json.dumps(ai_sonuc, indent=2, ensure_ascii=False))