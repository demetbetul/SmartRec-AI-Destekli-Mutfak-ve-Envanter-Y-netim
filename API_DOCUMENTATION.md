# SmartRec Backend API Dokumentasyon

## 🚀 Başlatma

```bash
cd backend
python app.py
```

API `http://localhost:5000` adresinde çalışacak.

---

## 📍 Temel Endpoints

### Health Check
```
GET /api/health
```
**Yanıt:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-27T10:30:00",
  "service": "SmartRec Backend API"
}
```

---

## 📚 Tarif API'ları

### Tüm Tarifleri Getir
```
GET /api/recipes
```
**Yanıt:**
```json
{
  "success": true,
  "count": 25,
  "tarifler": [
    {
      "id": 1,
      "ad": "Menemen",
      "malzemeler": ["yumurta", "domates", "soğan"],
      "talimatlar": "...",
      "kalori": 350,
      "zorluk": "Kolay"
    }
  ]
}
```

### Belirli Tarifi Getir
```
GET /api/recipes/<recipe_id>
```
**Yanıt:** Tarif nesnesi

### Tarifleri Filtrele
```
POST /api/recipes/filter
```
**İstek Gövdesi:**
```json
{
  "etiket": "vejetaryen",
  "zorluk": "Kolay"
}
```

### Eksik Malzemeleri Bul
```
GET /api/recipes/<recipe_id>/missing-ingredients
```
**Yanıt:**
```json
{
  "success": true,
  "recipe_id": 1,
  "eksik_malzemeler": ["sarımsak", "baharat"],
  "count": 2
}
```

---

## 🏪 Envanter API'ları

### Tüm Envanteri Getir
```
GET /api/inventory
```
**Yanıt:**
```json
{
  "success": true,
  "count": 15,
  "envanter": [
    {
      "ad": "Yumurta",
      "miktar": 12,
      "birim": "Adet",
      "skt": "2026-05-04"
    }
  ]
}
```

### Envantera Malzeme Ekle
```
POST /api/inventory/add
```
**İstek Gövdesi:**
```json
{
  "ad": "Peynir",
  "miktar": 2,
  "birim": "Kilo",
  "raf_omru_gun": 14
}
```
**Yanıt:**
```json
{
  "success": true,
  "message": "Peynir başarıyla eklendi",
  "urun": {
    "ad": "peynir",
    "miktar": 2,
    "birim": "Kilo"
  }
}
```

### Envanterden Malzeme Çıkar
```
DELETE /api/inventory/remove/<urun_id>
```
**Yanıt:**
```json
{
  "success": true,
  "message": "Peynir başarıyla silindi"
}
```

### Envanter İstatistikleri
```
GET /api/inventory/stats
```
**Yanıt:**
```json
{
  "success": true,
  "toplam_cesit": 15,
  "kritik_stok": ["Süt", "Peynir"],
  "kritik_stok_count": 2,
  "bozulmus_urunler": ["Domates"],
  "bozulmus_count": 1
}
```

---

## 🍽️ Menü (AI) API'ları

### Otomatik Menü Oluştur
```
GET /api/menu/create
```
*Envanterden malzemeleri otomatik olarak alır*

**Yanıt:**
```json
{
  "success": true,
  "menu": {
    "kaynak": "gemini",
    "baslangic": "Mezze Tabağı",
    "ana_yemek": "Kıymalı Makarna",
    "tatli": "Baklava",
    "eksik_malzemeler": ["Çam Fıstığı", "Ballı"],
    "kaloriler": {
      "baslangic_kalori": "250 kcal",
      "ana_yemek_kalori": "650 kcal",
      "tatli_kalori": "400 kcal"
    }
  },
  "kullanilan_malzemeler": ["yumurta", "domates", "soğan", ...]
}
```

### Özel Malzemelerle Menü Oluştur
```
POST /api/menu/create-custom
```
**İstek Gövdesi:**
```json
{
  "malzemeler": ["kıyma", "soğan", "domates", "makarna"]
}
```

---

## 📅 Günlük Kayıt API'ları

### Günlüğe Yemek Ekle
```
POST /api/daily-log/add
```
**İstek Gövdesi:**
```json
{
  "yemek_adi": "Menemen",
  "kalori": 350
}
```

### Günlük Kayıtları Getir
```
GET /api/daily-log
```
**Yanıt:**
```json
{
  "success": true,
  "count": 5,
  "kayitlar": [
    {
      "tarih": "2026-04-27",
      "yemek": "Menemen",
      "kalori": 350
    }
  ]
}
```

---

## 💾 Yedekleme API'ları

### Veri Yedekle
```
POST /api/backup
```
**Yanıt:**
```json
{
  "success": true,
  "message": "Veriler başarıyla yedeklendi"
}
```

---

## 🔍 Hata Yanıtları

### 404 Bulunamadı
```json
{
  "success": false,
  "error": "Endpoint bulunamadı"
}
```

### 400 Hatalı İstek
```json
{
  "success": false,
  "error": "Ürün adı gerekli"
}
```

### 500 Sunucu Hatası
```json
{
  "success": false,
  "error": "Sunucu hatası"
}
```

---

## 🧪 API'yi Test Etme

### Python ile
```bash
cd backend/api_tests
python test_api.py
```

### cURL ile
```bash
# Health Check
curl http://localhost:5000/api/health

# Tüm Tarifleri Al
curl http://localhost:5000/api/recipes

# Envanteri Al
curl http://localhost:5000/api/inventory

# Envanter İstatistikleri
curl http://localhost:5000/api/inventory/stats

# Yedek Al
curl -X POST http://localhost:5000/api/backup
```

### JavaScript (Frontend) ile
```javascript
// Menü Oluştur
fetch('http://localhost:5000/api/menu/create')
  .then(res => res.json())
  .then(data => console.log(data));

// Envanter Ekle
fetch('http://localhost:5000/api/inventory/add', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    ad: "Peynir",
    miktar: 2,
    birim: "Kilo"
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## 📝 .env Dosyası Ayarı

Backend dizininde `.env` dosyası oluşturun:

```env
GEMINI_API_KEY=your_gemini_key
SPOONACULAR_API_KEY=your_spoonacular_key
NUTRITION_API_KEY=your_nutrition_key
FLASK_ENV=development
FLASK_DEBUG=True
```

---

## 🛠️ Ortam Kurulumu

```bash
# 1. Virtual Environment Oluştur
python -m venv .venv

# 2. Etkinleştir
# Windows
.venv\Scripts\activate

# 3. Paketleri Yükle
pip install -r requirements.txt

# 4. Uygulamayı Başlat
python app.py
```

---

## 📊 Veri Yapıları

### Tarif (Recipe)
```json
{
  "id": 1,
  "ad": "Menemen",
  "malzemeler": ["yumurta", "domates"],
  "talimatlar": "Malzemeleri karıştırıp pişirin",
  "kalori": 350,
  "zorluk": "Kolay",
  "kategoriler": ["kahvaltı", "vejetaryen"]
}
```

### Envanter Ürünü
```json
{
  "ad": "yumurta",
  "miktar": 12,
  "birim": "Adet",
  "skt": "2026-05-04"
}
```

### Menü
```json
{
  "kaynak": "gemini",
  "baslangic": "Mezze",
  "ana_yemek": "Kıymalı Makarna",
  "tatli": "Baklava",
  "eksik_malzemeler": ["çam fıstığı"],
  "kaloriler": {
    "baslangic_kalori": "250 kcal",
    "ana_yemek_kalori": "650 kcal",
    "tatli_kalori": "400 kcal"
  }
}
```

---

## 🔐 CORS Ayarları

Frontend farklı porttan istek gönderse de çalışacak. `flask-cors` kullanılmıştır.

**Güvenlik:** Production ortamında CORS daha kısıtlı şekilde ayarlanmalı:
```python
CORS(app, resources={
    r"/api/*": {"origins": ["http://localhost:3000"]}
})
```

---

## 📞 İletişim

Sorunlar için backend klasöründeki `app.log` dosyasına bakın.

**Backend Geliştirme Devamı:** 
- Veritabanı entegrasyonu (SQLite/PostgreSQL)
- Kullanıcı kimlik doğrulaması (JWT)
- İleri filtreleme ve arama
- Resep resimleri upload
