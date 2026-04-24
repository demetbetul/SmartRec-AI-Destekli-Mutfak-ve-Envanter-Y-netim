import os
import json
import requests
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SPOONACULAR_API_KEY = os.getenv("SPOONACULAR_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)
# Test için İngilizce malzeme listesi (Spoonacular uyumu için)
elimizdeki_malzemeler = "chicken, tomato, pasta, cheese" 

def get_recipes_from_gemini():
    """Asıl servis: Gemini AI'dan 'kaynak' etiketli JSON döner."""
    print("🧠 BİRİNCİ PLAN: Gemini AI'a bağlanılıyor...")
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    Elimdeki şu malzemelerle 3 yemek öner: {elimizdeki_malzemeler}.
    Yanıtı SADECE aşağıdaki JSON formatında ver:
    {{
        "kaynak": "gemini",
        "tarifler": ["yemek1", "yemek2", "yemek3"]
    }}
    """
    
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(response_mime_type="application/json")
    )
    return json.loads(response.text)

def get_recipes_from_spoonacular():
    """Yedek servis: Spoonacular'dan 'kaynak' etiketli JSON döner."""
    print("⚙️ İKİNCİ PLAN (YEDEK): Spoonacular API'sine bağlanılıyor...")
    
    url = f"https://api.spoonacular.com/recipes/findByIngredients"
    params = {
        "ingredients": elimizdeki_malzemeler,
        "number": 3,
        "apiKey": SPOONACULAR_API_KEY
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    tarif_isimleri = [yemek["title"] for yemek in data]
    
    # Veriye manuel olarak 'kaynak' etiketini ekliyoruz
    return {
        "kaynak": "spoonacular",
        "tarifler": tarif_isimleri
    }

def akilli_sistem_yoneticisi():
    """Hangi servisin çalıştığını ve verinin kaynağını raporlar."""
    print("🚀 SmartRec Sistemi Başlatılıyor...\n")
    print("-" * 50)
    
    try:
        sonuc = get_recipes_from_gemini()
        print(f"✅ BAŞARILI: Veri kaynağı -> {sonuc['kaynak'].upper()}")
        
    except Exception:
        print("⚠️ DİKKAT: Gemini hata verdi, yedek sisteme geçiliyor...")
        sonuc = get_recipes_from_spoonacular()
        print(f"✅ BAŞARILI: Veri kaynağı -> {sonuc['kaynak'].upper()}")
        
    print("-" * 50)
    print(f"[{sonuc['kaynak'].upper()}] SERVİSİNDEN GELEN LİSTE:")
    for i, tarif in enumerate(sonuc["tarifler"], 1):
        print(f"{i}. {tarif}")

if __name__ == "__main__":
    akilli_sistem_yoneticisi()