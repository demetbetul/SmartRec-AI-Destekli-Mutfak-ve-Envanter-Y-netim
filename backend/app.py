"""
SmartRec Backend API
AI destekli mutfak ve envanter yönetim sistemi
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime, timedelta
from functools import wraps
from data_manager import (
    veriyi_yukle,
    dosya_yolu_getir,
    veri_temizle,
    envanter_malzeme_ekle,
    envanter_guncelle,
    envanter_istatistikleri,
    ai_icin_malzeme_listesi_hazirla,
    akilli_menu_olustur,
    yemeği_gunluge_kaydet,
    veri_yedekle,
    eksik_malzemeleri_bul,
    akilli_tarif_filtrele,
    kalori_hesapla
)

app = Flask(__name__)
CORS(app)  # Frontend isteplerine izin ver


# ==================== ERROR HANDLER DECORATOR ====================
def handle_errors(f):
    """Tüm API endpoints'inde hata handling için decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
    return decorated_function

# ==================== HEALTH CHECK ====================
@app.route('/api/health', methods=['GET'])
def health_check():
    """Sunucunun çalışıp çalışmadığını kontrol et"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "SmartRec Backend API"
    }), 200

# ==================== TARİF API'ları ====================
@app.route('/api/recipes', methods=['GET'])
@handle_errors
def get_all_recipes():
    """Tüm tarifleri getir"""
    tarifler = veriyi_yukle()
    if not tarifler:
        return jsonify({
            "success": False,
            "error": "Tarifler yüklenemedi"
        }), 500
    
    return jsonify({
        "success": True,
        "count": len(tarifler),
        "tarifler": tarifler
    }), 200

@app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
@handle_errors
def get_recipe(recipe_id):
    """Belirli bir tarifi ID'si ile getir"""
    tarifler = veriyi_yukle()
    tarif = next((t for t in tarifler if t.get("id") == recipe_id), None)
    
    if not tarif:
        return jsonify({
            "success": False,
            "error": "Tarif bulunamadı"
        }), 404
    
    return jsonify({
        "success": True,
        "tarif": tarif
    }), 200

@app.route('/api/recipes/filter', methods=['POST'])
@handle_errors
def filter_recipes():
    """Tarifleri filtrele (etiket, zorluk vb.)"""
    data = request.get_json()
    if not data:
        return jsonify({
            "success": False,
            "error": "JSON verisi gerekli"
        }), 400
    
    etiket = data.get('etiket')
    zorluk = data.get('zorluk')
    
    sonuclar = akilli_tarif_filtrele(etiket=etiket, zorluk_seviyesi=zorluk)
    
    return jsonify({
        "success": True,
        "count": len(sonuclar),
        "tarifler": sonuclar
    }), 200

@app.route('/api/recipes/<int:recipe_id>/missing-ingredients', methods=['GET'])
@handle_errors
def get_missing_ingredients(recipe_id):
    """Tarifte eksik olan malzemeleri getir"""
    eksikler = eksik_malzemeleri_bul(recipe_id)
    
    return jsonify({
        "success": True,
        "recipe_id": recipe_id,
        "eksik_malzemeler": eksikler,
        "count": len(eksikler)
    }), 200

# ==================== ENVANTER API'ları ====================
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    """Tüm envanteri getir"""
    try:
        path = dosya_yolu_getir('inventory.json')
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return jsonify({
            "success": True,
            "count": len(data.get("envanter", [])),
            "envanter": data.get("envanter", [])
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/inventory/add', methods=['POST'])
def add_to_inventory():
    """Envantera yeni malzeme ekle"""
    try:
        data = request.get_json()
        ad = data.get('ad')
        miktar = data.get('miktar', 1)
        birim = data.get('birim', 'Adet')
        raf_omru_gun = data.get('raf_omru_gun', 7)
        
        if not ad:
            return jsonify({
                "success": False,
                "error": "Ürün adı gerekli"
            }), 400
        
        envanter_malzeme_ekle(ad, miktar, birim, raf_omru_gun)
        
        return jsonify({
            "success": True,
            "message": f"{ad} başarıyla eklendi",
            "urun": {
                "ad": ad,
                "miktar": miktar,
                "birim": birim
            }
        }), 201
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/inventory/remove/<urun_id>', methods=['DELETE'])
def remove_from_inventory(urun_id):
    """Envanterden malzeme çıkar"""
    try:
        path = dosya_yolu_getir('inventory.json')
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # İsme göre bul ve sil
        original_count = len(data["envanter"])
        data["envanter"] = [
            item for item in data["envanter"] 
            if veri_temizle(item["ad"]) != veri_temizle(urun_id)
        ]
        
        if len(data["envanter"]) == original_count:
            return jsonify({
                "success": False,
                "error": "Ürün bulunamadı"
            }), 404
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            "success": True,
            "message": f"{urun_id} başarıyla silindi"
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/inventory/stats', methods=['GET'])
def get_inventory_stats():
    """Envanter istatistiklerini getir"""
    try:
        path = dosya_yolu_getir('inventory.json')
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        envanter = data.get("envanter", [])
        bugun = datetime.now()
        
        kritik_stok = [i for i in envanter if i["miktar"] <= 2]
        bozulmus_urunler = []
        
        for i in envanter:
            try:
                skt_tarihi = datetime.strptime(i["skt"], "%Y-%m-%d")
                if skt_tarihi <= bugun:
                    bozulmus_urunler.append(i)
            except:
                pass
        
        return jsonify({
            "success": True,
            "toplam_cesit": len(envanter),
            "kritik_stok": [item["ad"] for item in kritik_stok],
            "kritik_stok_count": len(kritik_stok),
            "bozulmus_urunler": [item["ad"] for item in bozulmus_urunler],
            "bozulmus_count": len(bozulmus_urunler)
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ==================== AI MENU API'ları ====================
@app.route('/api/menu/create', methods=['GET', 'POST'])
def create_menu():
    """AI ile akıllı menü oluştur"""
    try:
        # Envanterden malzemeleri otomatik al
        malzemeler = ai_icin_malzeme_listesi_hazirla()
        
        if not malzemeler:
            return jsonify({
                "success": False,
                "error": "Envanterden malzeme alınamadı"
            }), 400
        
        menu = akilli_menu_olustur(malzemeler)
        
        return jsonify({
            "success": True,
            "menu": menu,
            "kullanilan_malzemeler": malzemeler[:10]  # İlk 10 tanesini göster
        }), 200
    except Exception as e:
        print(f"AI Hatası Detayı: {e}") # Bu satırı ekle ki terminalde görelim
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/menu/create-custom', methods=['POST'])
def create_custom_menu():
    """Belirtilen malzemelerle menü oluştur"""
    try:
        data = request.get_json()
        malzemeler = data.get('malzemeler', [])
        
        if not malzemeler:
            return jsonify({
                "success": False,
                "error": "Malzeme listesi gerekli"
            }), 400
        
        menu = akilli_menu_olustur(malzemeler)
        
        return jsonify({
            "success": True,
            "menu": menu
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ==================== GÜNLÜK KAYıT API'ları ====================
@app.route('/api/daily-log/add', methods=['POST'])
def add_daily_log():
    """Günlüğe yemek kaydı ekle"""
    try:
        data = request.get_json()
        yemek_adi = data.get('yemek_adi')
        kalori = data.get('kalori', 0)
        
        if not yemek_adi:
            return jsonify({
                "success": False,
                "error": "Yemek adı gerekli"
            }), 400
        
        yemeği_gunluge_kaydet(yemek_adi, kalori)
        
        return jsonify({
            "success": True,
            "message": f"{yemek_adi} günlüğe kaydedildi"
        }), 201
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/daily-log', methods=['GET'])
def get_daily_logs():
    """Günlük kayıtları getir"""
    try:
        path = dosya_yolu_getir('daily_log.json')
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        kayitlar = data.get('gunluk_kayitlar', [])
        
        return jsonify({
            "success": True,
            "count": len(kayitlar),
            "kayitlar": kayitlar
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ==================== YEDEKLEME API'ları ====================
@app.route('/api/backup', methods=['POST'])
def create_backup():
    """Verileri yedekle"""
    try:
        veri_yedekle()
        return jsonify({
            "success": True,
            "message": "Veriler başarıyla yedeklendi"
        }), 201
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@app.route('/api/docs', methods=['GET'])
def get_docs():
    """Tüm API uç noktalarını (endpoints) listele"""
    return jsonify({
        "success": True,
        "message": "SmartRec API Sistemine Hoş Geldiniz",
        "available_endpoints": {
            "health_check": "/api/health [GET]",
            "recipes_list": "/api/recipes [GET]",
            "inventory_status": "/api/inventory [GET]",
            "inventory_stats": "/api/inventory/stats [GET]",
            "ai_menu_create": "/api/menu/create [GET/POST]",
            "daily_log": "/api/daily-log [GET]"
        }
    }), 200

# ==================== HATALAR ====================
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "Endpoint bulunamadı"
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "error": "Sunucu hatası"
    }), 500

if __name__ == '__main__':
    print("🚀 SmartRec Backend API Başlatılıyor...")
    print("📍 http://localhost:5000")
    print("📚 API Dokumentasyon: http://localhost:5000/api/docs")
    app.run(debug=True, host='0.0.0.0', port=5000)
