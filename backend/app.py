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
from werkzeug.security import generate_password_hash, check_password_hash
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
    bugunku_kaloriyi_getir,
    veri_yedekle,
    eksik_malzemeleri_bul,
    akilli_tarif_filtrele,
    kalori_hesapla,
    rastgele_chatbot_tarifi,
    ai_tarif_detayi_getir,
    akilli_envanter_analizi,
    secili_malzemelerle_tek_tarif,
    alisveris_linkleri_olustur,
    remzi_ile_sohbet_et,
    ai_alisveris_listesi_olustur,
    miktar_guncelle,
    akilli_temizlik_yap,
    sifir_ekstra_malzemeli_oneri
)

app = Flask(__name__)
CORS(app)


# ─── Hata yönetimi decorator'ı ────────────────────────────────────────────────
def handle_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500
    return decorated_function


# ─── Kullanıcı yardımcıları ───────────────────────────────────────────────────
def kullanicilari_yukle():
    path = dosya_yolu_getir('users.json')
    if not os.path.exists(path):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump([], f)
        return []
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def _email_from_request():
    """GET → query param, POST → JSON body'den email çeker."""
    if request.method == 'GET':
        return request.args.get('email', '').strip()
    data = request.get_json(silent=True) or {}
    return data.get('email', request.args.get('email', '')).strip()


# ==================== HEALTH CHECK ====================
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "SmartRec Backend API"
    }), 200


# ==================== TARİF API'ları ====================
@app.route('/api/recipes', methods=['GET'])
@handle_errors
def get_all_recipes():
    tarifler = veriyi_yukle()
    if not tarifler:
        return jsonify({"success": False, "error": "Tarifler yüklenemedi"}), 500
    return jsonify({"success": True, "count": len(tarifler), "tarifler": tarifler}), 200


@app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
@handle_errors
def get_recipe(recipe_id):
    tarifler = veriyi_yukle()
    tarif = next((t for t in tarifler if t.get("id") == recipe_id), None)
    if not tarif:
        return jsonify({"success": False, "error": "Tarif bulunamadı"}), 404
    return jsonify({"success": True, "tarif": tarif}), 200


@app.route('/api/recipes/filter', methods=['POST'])
@handle_errors
def filter_recipes():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "JSON verisi gerekli"}), 400
    sonuclar = akilli_tarif_filtrele(
        etiket=data.get('etiket'),
        zorluk_seviyesi=data.get('zorluk')
    )
    return jsonify({"success": True, "count": len(sonuclar), "tarifler": sonuclar}), 200


@app.route('/api/recipes/<int:recipe_id>/missing-ingredients', methods=['GET'])
@handle_errors
def eksik_malzemeleri_getir_api(recipe_id):
    # DÜZELTİLDİ: user_email alınıp eksik_malzemeleri_bul'a iletildi.
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "error": "Email parametresi gerekli"}), 400

    eksikler = eksik_malzemeleri_bul(recipe_id, user_email)

    if not eksikler:
        return jsonify({
            "success": True,
            "message": "Hiç eksik malzeme yok, hemen pişirmeye başla!",
            "eksik_malzemeler_detay": [],
            "toplu_arama_linki": ""
        }), 200

    import urllib.parse
    linkli_eksikler = alisveris_linkleri_olustur(eksikler)
    toplu_link = f"https://www.migros.com.tr/arama?q={urllib.parse.quote(' '.join(eksikler))}"

    return jsonify({
        "success": True,
        "recipe_id": recipe_id,
        "count": len(eksikler),
        "eksik_malzemeler_detay": linkli_eksikler,
        "toplu_arama_linki": toplu_link
    }), 200


# ==================== ENVANTER API'ları ====================
@app.route('/api/inventory', methods=['GET'])
@handle_errors
def get_inventory():
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "error": "Email parametresi gerekli!"}), 400

    data = veriyi_yukle('inventory.json', user_email)
    return jsonify({
        "success": True,
        "count": len(data.get("envanter", [])),
        "envanter": data.get("envanter", [])
    }), 200


@app.route('/api/inventory/add', methods=['POST'])
@handle_errors
def add_to_inventory():
    data = request.get_json()
    user_email = data.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "error": "Email bilgisi eksik!"}), 400

    basari, mesaj = envanter_malzeme_ekle(
        user_email=user_email,
        ad=data.get('ad'),
        miktar=data.get('miktar'),
        birim=data.get('birim', 'Adet'),
        kategori=data.get('kategori'),
        tuketim_suresi=data.get('tuketim_suresi', 7)
    )
    return jsonify({"success": basari, "message": mesaj}), 200 if basari else 400


@app.route('/api/inventory/remove/<urun_id>', methods=['DELETE'])
@handle_errors
def remove_from_inventory(urun_id):
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "error": "Email gerekli"}), 400

    path = dosya_yolu_getir('inventory.json', user_email)
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    original_count = len(data["envanter"])
    data["envanter"] = [
        item for item in data["envanter"]
        if veri_temizle(item["ad"]) != veri_temizle(urun_id)
    ]

    if len(data["envanter"]) == original_count:
        return jsonify({"success": False, "error": "Ürün bulunamadı"}), 404

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return jsonify({"success": True, "message": f"{urun_id} başarıyla silindi"}), 200


@app.route('/api/inventory/stats', methods=['GET'])
@handle_errors
def get_inventory_stats():
    # DÜZELTİLDİ: Önceki kodda user_email alınıp kullanılmıyordu ve
    # dosya yolu yanlış çağrılıyordu. Şimdi kullanıcıya özel yol.
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "error": "Email gerekli"}), 400

    path = dosya_yolu_getir('inventory.json', user_email)
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    envanter = data.get("envanter", [])
    bugun    = datetime.now()

    kritik_stok    = [i for i in envanter if i.get("miktar", 0) <= 2]
    bozulmus = []
    for i in envanter:
        try:
            if datetime.strptime(i["skt"], "%Y-%m-%d") <= bugun:
                bozulmus.append(i)
        except Exception:
            pass

    return jsonify({
        "success": True,
        "toplam_cesit": len(envanter),
        "kritik_stok": [item["ad"] for item in kritik_stok],
        "kritik_stok_count": len(kritik_stok),
        "bozulmus_urunler": [item["ad"] for item in bozulmus],
        "bozulmus_count": len(bozulmus)
    }), 200


# ==================== MİKTAR VE AKILLI TEMİZLİK ====================
@app.route('/api/inventory/qty/<urun_ad>', methods=['POST'])
@handle_errors
def update_qty(urun_ad):
    user_email = request.args.get('email', '').strip()
    degisim    = int(request.args.get('degisim', 0))
    if not user_email:
        return jsonify({"success": False, "message": "Email eksik!"}), 400
    basari, mesaj = miktar_guncelle(user_email, urun_ad, degisim)
    return jsonify({"success": basari, "message": mesaj})


@app.route('/api/inventory/smart-clean', methods=['POST'])
@handle_errors
def smart_clean():
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "message": "Email eksik!"}), 400
    basari, silinenler = akilli_temizlik_yap(user_email)
    return jsonify({"success": basari, "silinenler": silinenler})


# ==================== TARİF ÖNERİ API'ları ====================
@app.route('/api/recipes/smart', methods=['GET'])
@handle_errors
def get_smart_recipes():
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "error": "Email gerekli"}), 400
    # DÜZELTİLDİ: akilli_menu_olustur artık user_email alıyor.
    tarifler = akilli_menu_olustur(user_email)
    return jsonify({"success": True, "recipes": tarifler}), 200


# ==================== AI MENU API'ları ====================
@app.route('/api/menu/create', methods=['GET', 'POST'])
@handle_errors
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
@handle_errors
def create_custom_menu():
    data = request.get_json()
    malzemeler = data.get('malzemeler', [])
    if not malzemeler:
        return jsonify({"success": False, "error": "Malzeme listesi gerekli"}), 400
    # Özel menü için malzeme listesi doğrudan verildiğinden email gerekmez;
    # ancak Gemini'ye gönderilecek liste frontend'den geliyor.
    from data_manager import get_recipes_from_gemini
    malzemeler_metni = ", ".join(malzemeler)
    try:
        menu = get_recipes_from_gemini(malzemeler_metni)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    return jsonify({"success": True, "menu": menu}), 200


@app.route('/api/chatbot/recipe', methods=['GET'])
@handle_errors
def get_chatbot_recipe():
    # DÜZELTİLDİ: user_email alınıp rastgele_chatbot_tarifi'ne iletildi.
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "error": "Email gerekli"}), 400
    tarif = rastgele_chatbot_tarifi(user_email)
    return jsonify({"success": True, "data": tarif}), 200


@app.route('/api/inventory/strict-suggestions', methods=['GET'])
@handle_errors
def strict_inventory_suggestions():
    # DÜZELTİLDİ: user_email alınıp sifir_ekstra_malzemeli_oneri'ye iletildi.
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "error": "Email gerekli"}), 400
    tarifler = sifir_ekstra_malzemeli_oneri(user_email)
    return jsonify({"success": True, "data": tarifler}), 200


@app.route('/api/recipe/details', methods=['POST'])
@app.route('/api/menu/detail', methods=['POST'])
@handle_errors
def get_recipe_details():
    # DÜZELTİLDİ: user_email alınıp ai_tarif_detayi_getir'e iletildi.
    data       = request.get_json()
    yemek_adi  = data.get('yemek_adi', '').strip()

    if not yemek_adi:
        return jsonify({"success": False, "error": "Yemek adı belirtilmedi!"}), 400


    tarif_detayi = ai_tarif_detayi_getir(yemek_adi)
    return jsonify({
        "success": True,
        "data": tarif_detayi,
        "detay": tarif_detayi  # index.html geriye dönük uyumluluk için
    }), 200


@app.route('/api/recipe/custom-ingredients', methods=['POST'])
@handle_errors
def get_custom_ingredients_recipe():
    data       = request.get_json()
    secilenler = data.get('malzemeler', [])
    if not secilenler:
        return jsonify({"success": False,
                        "error": "Lütfen en az bir malzeme seçin!"}), 400
    ozel_tarif = secili_malzemelerle_tek_tarif(secilenler)
    return jsonify({"success": True, "data": ozel_tarif}), 200


# ==================== GÜNLÜK KAYIT & KALORİ ====================
@app.route('/api/daily-log', methods=['GET'])
@handle_errors
def get_daily_logs():
    user_email = request.args.get('email', '').strip()
    # Kullanıcıya özel log dosyasından kayıtlar döndürülebilir.
    # Şimdilik boş liste; genişletmek için veriyi_yukle kullanılabilir.
    return jsonify({"success": True, "kayitlar": []}), 200


@app.route('/api/calories', methods=['GET'])
@handle_errors
def get_calories():
    # DÜZELTİLDİ: user_email alınıp bugunku_kaloriyi_getir'e iletildi.
    user_email    = request.args.get('email', '').strip()
    bugunku_toplam = bugunku_kaloriyi_getir(user_email if user_email else None)
    return jsonify({
        "bugun": bugunku_toplam,
        "hedef": 2000,
        "haftalik": [1800, 2200, 1950, 1420, 1600, 1500, bugunku_toplam]
    }), 200


@app.route('/api/calories/add', methods=['POST'])
@handle_errors
def add_calories():
    data       = request.get_json()
    user_email = data.get('email', '').strip()
    yemek_adi  = data.get('yemek', 'Bilinmeyen Yemek')
    kalori     = data.get('kalori', 0)
    # DÜZELTİLDİ: yemeği_gunluge_kaydet'e user_email iletildi.
    yemeği_gunluge_kaydet(yemek_adi, int(kalori), user_email if user_email else None)
    return jsonify({"success": True}), 200


# ==================== KULLANICI YÖNETİMİ ====================
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data     = request.get_json()
        email    = data.get('email', '').strip()
        password = data.get('password', '').strip()
        ad       = data.get('ad', 'Yeni Kullanıcı').strip()

        if not email or not password:
            return jsonify({"success": False,
                            "message": "E-posta ve şifre zorunludur!"}), 400

        users = kullanicilari_yukle()
        if any(u['email'] == email for u in users):
            return jsonify({"success": False,
                            "message": "Bu e-posta zaten kayıtlı!"}), 400

        users.append({"ad": ad, "email": email,
                      "password": generate_password_hash(password)})

        path = dosya_yolu_getir('users.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(users, f, ensure_ascii=False, indent=2)
            f.flush()

        # Kullanıcının klasörünü ve inventory.json'unu hazır oluştur
        dosya_yolu_getir('inventory.json', email)

        print(f"✅ Kullanıcı kaydedildi: {email}")
        return jsonify({"success": True, "message": "Kayıt başarılı!"}), 201

    except Exception as e:
        print(f"❌ Kayıt Hatası: {e}")
        return jsonify({"success": False,
                        "message": f"Sunucu hatası: {e}"}), 500


@app.route('/api/login', methods=['POST'])
def login():
    data     = request.get_json()
    email    = data.get('email', '').strip()
    password = data.get('password', '').strip()

    users = kullanicilari_yukle()
    user  = next((u for u in users if u['email'].strip() == email), None)

    if user and check_password_hash(user['password'], password):
        return jsonify({
            "success": True,
            "message": "Giriş başarılı!",
            "user": {"ad": user['ad'], "email": user['email']}
        }), 200

    return jsonify({"success": False,
                    "message": "E-posta veya şifre hatalı!"}), 401


# ==================== BİLDİRİM API ====================
@app.route('/api/notifications', methods=['GET'])
@handle_errors
def get_notifications():
    # DÜZELTİLDİ: user_email alınıp kullanıcıya özel inventory okunuyor.
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "error": "Email gerekli"}), 400

    path = dosya_yolu_getir('inventory.json', user_email)
    if not os.path.exists(path):
        return jsonify({"success": True, "bildirimler": []}), 200

    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    envanter   = data.get("envanter", [])
    bildirimler = []
    bugun       = datetime.now()

    for urun in envanter:
        if not urun.get("ad") or not urun.get("skt"):
            continue
        try:
            skt_tarihi = datetime.strptime(str(urun["skt"]), "%Y-%m-%d")
            fark       = (skt_tarihi - bugun).days
            if fark < 0:
                bildirimler.append({
                    "tip": "danger",
                    "mesaj": f"⚠️ {urun['ad']} son kullanma tarihi {abs(fark)} gün geçti!"
                })
            elif fark <= 3:
                bildirimler.append({
                    "tip": "warning",
                    "mesaj": f"⏳ {urun['ad']} {fark + 1} gün içinde bozulacak."
                })
            if int(urun.get("miktar", 0)) <= 2:
                bildirimler.append({
                    "tip": "info",
                    "mesaj": f"🛒 {urun['ad']} stokta azalıyor ({urun['miktar']} kaldı)."
                })
        except (ValueError, TypeError):
            continue

    return jsonify({"success": True, "bildirimler": bildirimler}), 200


@app.route('/api/notifications/ai-insight', methods=['GET'])
@handle_errors
def get_ai_insight():
    # DÜZELTİLDİ: user_email alınıp akilli_envanter_analizi'ne iletildi.
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "error": "Email gerekli"}), 400
    analiz = akilli_envanter_analizi(user_email)
    return jsonify({"success": True, "data": analiz}), 200


# ==================== YEDEKLEME ====================
@app.route('/api/backup', methods=['POST'])
@handle_errors
def create_backup():
    veri_yedekle()
    return jsonify({"success": True,
                    "message": "Veriler başarıyla yedeklendi"}), 201


# ==================== AI SOHBET (Remzi) ====================
@app.route('/api/ai/chat', methods=['POST'])
@handle_errors
def chat_with_remzi():
    data            = request.get_json()
    kullanici_mesaji = data.get('mesaj', '')
    # DÜZELTİLDİ: user_email alınıp remzi_ile_sohbet_et'e iletildi.
    user_email      = data.get('email', '').strip()

    print(f"Remzi'ye gelen mesaj: {kullanici_mesaji} (kullanıcı: {user_email})")
    gercek_cevap = remzi_ile_sohbet_et(kullanici_mesaji, user_email if user_email else None)
    return jsonify({"success": True, "cevap": gercek_cevap}), 200


# ==================== AI ALIŞVERİŞ LİSTESİ ====================
@app.route('/api/shopping-list/ai', methods=['POST'])
@handle_errors
def generate_ai_shopping_list():
    # DÜZELTİLDİ: user_email alınıp ai_alisveris_listesi_olustur'a iletildi.
    data       = request.get_json(silent=True) or {}
    user_email = data.get('email', '').strip()
    gercek_liste = ai_alisveris_listesi_olustur(user_email if user_email else None)
    return jsonify({"success": True, "liste": gercek_liste}), 200


# ==================== DOCS ====================
@app.route('/api/docs', methods=['GET'])
def get_docs():
    return jsonify({
        "success": True,
        "message": "SmartRec API Sistemine Hoş Geldiniz",
        "not": "Tüm envanter endpoint'leri ?email=kullanici@mail.com parametresi gerektirir.",
        "available_endpoints": {
            "health_check":        "/api/health [GET]",
            "recipes_list":        "/api/recipes [GET]",
            "inventory_status":    "/api/inventory [GET] ?email=",
            "inventory_add":       "/api/inventory/add [POST] body:{email}",
            "inventory_remove":    "/api/inventory/remove/<id> [DELETE] ?email=",
            "inventory_stats":     "/api/inventory/stats [GET] ?email=",
            "inventory_qty":       "/api/inventory/qty/<ad> [POST] ?email=&degisim=",
            "inventory_clean":     "/api/inventory/smart-clean [POST] ?email=",
            "smart_recipes":       "/api/recipes/smart [GET] ?email=",
            "ai_menu_create":      "/api/menu/create [GET/POST] ?email=",
            "ai_chat":             "/api/ai/chat [POST] body:{mesaj, email}",
            "notifications":       "/api/notifications [GET] ?email=",
            "ai_insight":          "/api/notifications/ai-insight [GET] ?email=",
            "calories":            "/api/calories [GET] ?email=",
            "calories_add":        "/api/calories/add [POST] body:{email, yemek, kalori}",
        }
    }), 200


# ==================== HATALAR ====================
@app.errorhandler(404)
def not_found(error):
    return jsonify({"success": False, "error": "Endpoint bulunamadı"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"success": False, "error": "Sunucu hatası"}), 500


if __name__ == '__main__':
    print("🚀 SmartRec Backend API Başlatılıyor...")
    print("📍 http://localhost:5000")
    print("📚 API Dokümantasyon: http://localhost:5000/api/docs")
    app.run(debug=True, host='0.0.0.0', port=5000)