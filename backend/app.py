"""
SmartRec Backend API
AI destekli mutfak ve envanter yönetim sistemi
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import re
from datetime import datetime, timedelta
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from data_manager import (
    # ── Temel veri işlemleri ──────────────────────────────
    load_json,
    save_json,
    veriyi_yukle,
    veri_temizle,
    # ── Kullanıcıya özel envanter ─────────────────────────
    kullanici_envanterini_getir,
    kullanici_envanterini_kaydet,
    # ── Kullanıcıya özel log ──────────────────────────────
    kullanici_logunu_getir,
    kullanici_logunu_kaydet,
    # ── Envanter işlemleri ────────────────────────────────
    envanter_malzeme_ekle,
    envanter_guncelle,
    envanter_istatistikleri,
    akilli_temizlik_yap,
    # ── AI / Tarif ────────────────────────────────────────
    ai_icin_malzeme_listesi_hazirla,
    akilli_menu_olustur,
    akilli_tarif_filtrele,
    eksik_malzemeleri_bul,
    kalori_hesapla,
    rastgele_chatbot_tarifi,
    ai_tarif_detayi_getir,
    akilli_envanter_analizi,
    secili_malzemelerle_tek_tarif,
    sifir_ekstra_malzemeli_oneri,
    # ── Kalori ────────────────────────────────────────────
    yemeği_gunluge_kaydet,
    bugunku_kaloriyi_getir,
    # ── Alışveriş & Sohbet ───────────────────────────────
    alisveris_linkleri_olustur,
    remzi_ile_sohbet_et,
    ai_alisveris_listesi_olustur,
    # ── Yedekleme ─────────────────────────────────────────
    veri_yedekle,
    # ── Gemini menü (özel menü endpoint'i için) ───────────
    get_recipes_from_gemini,
    # ── Envantere özel AI öneri (remzi.html sağ kart) ────
    envanter_icin_ai_tarif_oner,
)

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)


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
def _users_path():
    """users.json'un merkezi DATA_DIR içindeki yolu."""
    return os.path.join(DATA_DIR, 'users.json')


def kullanicilari_yukle():
    """users.json'u DATA_DIR'dan okur. Yoksa boş liste ile oluşturur."""
    path = _users_path()
    if not os.path.exists(path):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump([], f)
        return []
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []


def kullanicilari_kaydet(users: list):
    """users.json'u DATA_DIR'a yazar."""
    path = _users_path()
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)
        f.flush()


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
    ham = veriyi_yukle('recipes.json')
    if isinstance(ham, dict):
        tarifler = ham.get('tarifler', [])
    elif isinstance(ham, list):
        tarifler = ham
    else:
        tarifler = []
    if not tarifler:
        return jsonify({"success": True, "count": 0, "tarifler": []}), 200
    return jsonify({"success": True, "count": len(tarifler), "tarifler": tarifler}), 200


@app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
@handle_errors
def get_recipe(recipe_id):
    ham = veriyi_yukle('recipes.json')
    tarifler = ham.get('tarifler', ham) if isinstance(ham, dict) else (ham if isinstance(ham, list) else [])
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

    envanter = kullanici_envanterini_getir(user_email)
    return jsonify({
        "success": True,
        "count": len(envanter),
        "envanter": envanter
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

    envanter = kullanici_envanterini_getir(user_email)
    original_count = len(envanter)
    envanter = [
        item for item in envanter
        if veri_temizle(item["ad"]) != veri_temizle(urun_id)
    ]

    if len(envanter) == original_count:
        return jsonify({"success": False, "error": "Ürün bulunamadı"}), 404

    kullanici_envanterini_kaydet(user_email, envanter)
    return jsonify({"success": True, "message": f"{urun_id} başarıyla silindi"}), 200


@app.route('/api/inventory/stats', methods=['GET'])
@handle_errors
def get_inventory_stats():
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "error": "Email gerekli"}), 400

    envanter = kullanici_envanterini_getir(user_email)
    bugun = datetime.now()

    kritik_stok = [i for i in envanter if i.get("miktar", 0) <= 2]
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

    envanter = kullanici_envanterini_getir(user_email)
    urun = next(
        (item for item in envanter if veri_temizle(item["ad"]) == veri_temizle(urun_ad)),
        None
    )
    if not urun:
        return jsonify({"success": False, "message": f"{urun_ad} envanterde bulunamadı"}), 404

    urun["miktar"] = max(0, urun.get("miktar", 0) + degisim)
    kullanici_envanterini_kaydet(user_email, envanter)
    return jsonify({"success": True, "message": f"{urun_ad} miktarı güncellendi → {urun['miktar']}"}), 200


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

    malzemeler = ai_icin_malzeme_listesi_hazirla(user_email)
    if not malzemeler:
        return jsonify({"success": True, "recipes": {"kaynak": "bos", "menuler": []}}), 200

    tarifler = akilli_menu_olustur(malzemeler)
    return jsonify({"success": True, "recipes": tarifler}), 200


# ==================== AI MENU API'ları ====================
@app.route('/api/menu/create', methods=['GET', 'POST'])
@handle_errors
def create_menu():
    """AI ile rastgele günlük akıllı menü oluştur (Envanterden bağımsız)"""
    import random
    konseptler = [
        "tavuk", "kırmızı et", "balık", "mevsim sebzeleri",
        "bakliyat", "mantar", "patlıcan", "kabak", "kıyma",
        "peynir", "deniz ürünleri", "makarna", "fırın yemekleri", "yöresel"
    ]
    ilham_kaynagi = random.sample(konseptler, 3)
    menu = akilli_menu_olustur(ilham_kaynagi)
    return jsonify({
        "success": True,
        "menu": menu,
        "kullanilan_malzemeler": ilham_kaynagi
    }), 200


@app.route('/api/menu/create-custom', methods=['POST'])
@handle_errors
def create_custom_menu():
    data = request.get_json()
    malzemeler = data.get('malzemeler', [])
    if not malzemeler:
        return jsonify({"success": False, "error": "Malzeme listesi gerekli"}), 400
    malzemeler_metni = ", ".join(malzemeler)
    try:
        menu = get_recipes_from_gemini(malzemeler_metni)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    return jsonify({"success": True, "menu": menu}), 200


@app.route('/api/chatbot/recipe', methods=['GET'])
@handle_errors
def get_chatbot_recipe():
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "error": "Email gerekli"}), 400
    tarif = rastgele_chatbot_tarifi(user_email)
    return jsonify({"success": True, "data": tarif}), 200


@app.route('/api/inventory/strict-suggestions', methods=['GET'])
@handle_errors
def strict_inventory_suggestions():
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "error": "Email gerekli"}), 400
    tarifler = sifir_ekstra_malzemeli_oneri(user_email)
    return jsonify({"success": True, "data": tarifler}), 200


@app.route('/api/recipe/details', methods=['POST'])
@app.route('/api/menu/detail', methods=['POST'])
@handle_errors
def get_recipe_details():
    data = request.get_json()
    yemek_adi  = data.get('yemek_adi', '').strip()
    user_email = data.get('email', '').strip() or None

    if not yemek_adi:
        return jsonify({"success": False, "error": "Yemek adı belirtilmedi!"}), 400

    tarif_detayi = ai_tarif_detayi_getir(yemek_adi, user_email)
    return jsonify({
        "success": True,
        "data": tarif_detayi,
        "detay": tarif_detayi 
    }), 200


@app.route('/api/recipe/custom-ingredients', methods=['POST'])
@handle_errors
def get_custom_ingredients_recipe():
    data = request.get_json()
    secilenler = data.get('malzemeler', [])
    if not secilenler:
        return jsonify({"success": False, "error": "Lütfen en az bir malzeme seçin!"}), 400
    ozel_tarif = secili_malzemelerle_tek_tarif(secilenler)
    return jsonify({"success": True, "data": ozel_tarif}), 200


# ==================== GÜNLÜK KAYIT & KALORİ ====================
@app.route('/api/daily-log', methods=['GET'])
@handle_errors
def get_daily_logs():
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": True, "kayitlar": []}), 200

    kayitlar = kullanici_logunu_getir(user_email)
    return jsonify({"success": True, "kayitlar": kayitlar}), 200


@app.route('/api/calories', methods=['GET'])
@handle_errors
def get_calories():
    user_email = request.args.get('email', '').strip()
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
        
        if not re.match(r'^(?=.*\d)(?=.*[!@#$%^&*.,?+\-]).{8,}$', password):
            return jsonify({"success": False, 
                            "message": "Şifre en az 8 karakter uzunluğunda olmalı, en az 1 rakam ve 1 özel karakter içermelidir."}), 400

        users = kullanicilari_yukle()
        if any(u['email'] == email for u in users):
            return jsonify({"success": False,
                            "message": "Bu e-posta zaten kayıtlı!"}), 400

        users.append({
            "ad": ad,
            "email": email,
            "password": generate_password_hash(password)
        })
        kullanicilari_kaydet(users)

        kullanici_envanterini_kaydet(email, [])

        print(f"✅ Kullanıcı kaydedildi: {email}")
        return jsonify({"success": True, "message": "Kayıt başarılı!"}), 201

    except Exception as e:
        print(f"❌ Kayıt Hatası: {e}")
        return jsonify({"success": False, "message": f"Sunucu hatası: {e}"}), 500


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
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "error": "Email gerekli"}), 400

    envanter    = kullanici_envanterini_getir(user_email)
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


# ==================== ENVANTERE ÖZEL AI ÖNERİSİ (remzi.html sağ kart) ====================
@app.route('/api/inventory/ai-suggestions', methods=['GET'])
@handle_errors
def get_inventory_suggestions():
    """
    Kullanıcının envanterindeki malzemelere göre Gemini'den
    ana yemek + çorba + tatlı önerir.
    remzi.html'deki fetchInventorySuggestions() bu endpoint'i çağırır.
    """
    user_email = request.args.get('email', '').strip()
    if not user_email:
        return jsonify({"success": False, "error": "Email parametresi gerekli"}), 400

    tarifler = envanter_icin_ai_tarif_oner(user_email)

    if not tarifler:
        return jsonify({"success": False, "data": [], "message": "Öneri üretilemedi"}), 200

    return jsonify({"success": True, "data": tarifler}), 200


# ==================== AI SOHBET (Remzi) ====================
@app.route('/api/ai/chat', methods=['POST'])
@handle_errors
def chat_with_remzi():
    data             = request.get_json()
    kullanici_mesaji = data.get('mesaj', '')
    user_email       = data.get('email', '').strip()

    print(f"Remzi'ye gelen mesaj: {kullanici_mesaji} (kullanıcı: {user_email})")
    gercek_cevap = remzi_ile_sohbet_et(kullanici_mesaji, user_email if user_email else None)
    return jsonify({"success": True, "cevap": gercek_cevap}), 200


# ==================== AI ALIŞVERİŞ LİSTESİ ====================
@app.route('/api/shopping-list/ai', methods=['POST'])
@handle_errors
def generate_ai_shopping_list():
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
            "ai_menu_create":      "/api/menu/create [GET/POST]",
            "ai_chat":             "/api/ai/chat [POST] body:{mesaj, email}",
            "notifications":       "/api/notifications [GET] ?email=",
            "ai_insight":          "/api/notifications/ai-insight [GET] ?email=",
            "calories":            "/api/calories [GET] ?email=",
            "calories_add":        "/api/calories/add [POST] body:{email, yemek, kalori}",
            "daily_log":           "/api/daily-log [GET] ?email=",
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
    app.run(debug=False, host='0.0.0.0', port=5000)