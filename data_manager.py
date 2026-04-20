import json
import os
from datetime import datetime

def veriyi_yukle():
    # Dosya yolunu belirliyoruz
    dosya_yolu = os.path.join('data', 'recipes.json')
    
    try:
        with open(dosya_yolu, 'r', encoding='utf-8') as f:
            veri = json.load(f)
            return veri["tarifler"]
    except FileNotFoundError:
        return "Hata: JSON dosyası bulunamadı! Lütfen 'data' klasörünü kontrol edin."

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
    """
    inventory.json dosyasındaki malzemeleri AI'nın anlayabileceği 
    tek bir metin (string) haline getirir.
    """
    try:
        with open('data/inventory.json', 'r', encoding='utf-8') as f:
            envanter = json.load(f)["envanter"]
        
        # Sadece malzeme isimlerini al ve virgülle birleştir
        malzeme_isimleri = [item["ad"].lower() for item in envanter]
        malzeme_metni = ", ".join(malzeme_isimleri)
        
        return malzeme_metni
    except Exception as e:
        return f"Malzeme listesi hazırlanamadı: {e}"
    
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
    

if __name__ == "__main__":
    try:
        print("\n" + "="*30)
        print("🚀 SMARTREC SİSTEM KONTROLÜ")
        print("="*30)
        
        # Veri Yükleme Testi
        tarifler = veriyi_yukle()
        print(f"✅ Veritabanı: {len(tarifler)} tarif başarıyla yüklendi.")
        
        # Filtreleme Testi
        v_tarifler = akilli_tarif_filtrele(etiket="vejetaryen")
        print(f"🌱 Filtreleme: {len(v_tarifler)} adet vejetaryen tarif bulundu.")
        
        print("="*30)
        print("✨ SİSTEM ŞU AN KUSURSUZ ÇALIŞIYOR!")
    except Exception as e:
        print(f"❌ KONTROL SIRASINDA HATA: {e}")
        
# AI Malzeme Listesi Testi
ai_listesi = ai_icin_malzeme_listesi_hazirla()
print(f"\n🤖 AI'ya Gidecek Malzemeler: {ai_listesi}")
    
# Günlük Kayıt Testi
#yemeği_gunluge_kaydet("Kuru Fasulye", 600)