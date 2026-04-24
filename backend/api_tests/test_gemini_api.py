import os
import json # JSON verilerini Python sözlüğüne çevirmek için ekledik
from dotenv import load_dotenv
import google.generativeai as genai

# .env dosyasından API anahtarını yükle
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("❌ HATA: API anahtarı bulunamadı! Lütfen .env dosyanızı kontrol edin.")
else:
    genai.configure(api_key=API_KEY)

    def test_smartrec_ai_json():
        print("Gemini AI'a bağlanılıyor (Katı JSON Modu)...\n")
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        elimizdeki_malzemeler = "tavuk göğsü, 2 adet domates, yarım paket makarna, biraz kaşar peyniri"
        
        # Prompt'umuzu bir yazılımın anlayacağı formatta istiyoruz
        prompt = f"""
        Sen profesyonel bir aşçısın. Elimdeki şu malzemeleri kullanarak bana başlangıç, 
        ana yemek ve tatlıdan oluşan 3 aşamalı bir menü öner: {elimizdeki_malzemeler}. 
        
        ÖNEMLİ KURALLAR:
        1. Yanıtını SADECE JSON formatında ver. 
        2. JSON formatı tam olarak aşağıdaki gibi olmalı. Dışına markdown (```json) veya ekstra metin ekleme:
        {{
            "baslangic": "Başlangıç yemeğinin adı ve kısa tarifi",
            "ana_yemek": "Ana yemeğin adı ve kısa tarifi",
            "tatli": "Tatlının adı ve kısa tarifi",
            "eksik_malzemeler": ["eksik malzeme 1", "eksik malzeme 2", "eksik malzeme 3"]
        }}
        """
        
        try:
            # generation_config ile AI'ı zorunlu JSON formatına sokuyoruz
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            
            print("✅ AI Yanıtı Başarıyla Alındı!\n")
            
            # Gelen JSON metnini gerçek bir Python Dictionary'sine (Sözlüğüne) dönüştürüyoruz
            # Bu sayede verileri nokta atışı çekebiliriz
            veri = json.loads(response.text)
            
            # Projedeki Backend Yöneticisi bu verileri artık böyle rahatça kullanabilecek:
            print("--- AYRIŞTIRILMIŞ VERİLER ---")
            print(f"🍲 Başlangıç: {veri['baslangic']}")
            print(f"🍽️ Ana Yemek: {veri['ana_yemek']}")
            print(f"🍮 Tatlı: {veri['tatli']}")
            print(f"🛒 Alışveriş Listesi: {', '.join(veri['eksik_malzemeler'])}")
            print("-" * 50)
            
        except json.JSONDecodeError:
            print("❌ HATA: Gemini geçerli bir JSON döndürmedi. Veriyi parçalayamadık.")
        except Exception as e:
            print(f"❌ Kritik bir hata oluştu: {e}")

if __name__ == "__main__":
    test_smartrec_ai_json()