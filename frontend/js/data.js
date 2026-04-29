/**
 * SmartRec - Veri Yönetimi Modülü
 * Görev: Backend API ile iletişim, veri alma/gönderme
 */

const API_BASE_URL = 'http://localhost:5000/api';

// ==================== ENVANTER OPERASYONLARI ====================

async function getInventory() {
    try {
        const response = await fetch(`${API_BASE_URL}/inventory`);
        if (!response.ok) throw new Error('Envanter verisi alınamadı');
        return await response.json();
    } catch (error) {
        console.error('Envanter hatası:', error);
        return { success: false, envanter: [] };
    }
}

async function addInventoryItem(itemName, quantity, unit = 'Adet', shelfLife = 7) {
    try {
        const response = await fetch(`${API_BASE_URL}/inventory/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ad: itemName,
                miktar: quantity,
                birim: unit,
                raf_omru_gun: shelfLife
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Envanter ekleme hatası:', error);
        return { success: false };
    }
}

async function removeInventoryItem(itemName) {
    try {
        const response = await fetch(`${API_BASE_URL}/inventory/remove/${itemName}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (error) {
        console.error('Envanter silme hatası:', error);
        return { success: false };
    }
}

async function getInventoryStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/inventory/stats`);
        return await response.json();
    } catch (error) {
        console.error('İstatistik hatası:', error);
        return { success: false };
    }
}

// ==================== TARİF OPERASYONLARI ====================

async function getAllRecipes() {
    try {
        const response = await fetch(`${API_BASE_URL}/recipes`);
        return await response.json();
    } catch (error) {
        console.error('Tarifler alınamadı:', error);
        return { success: false, tarifler: [] };
    }
}

async function getRecipeById(recipeId) {
    try {
        const response = await fetch(`${API_BASE_URL}/recipes/${recipeId}`);
        return await response.json();
    } catch (error) {
        console.error('Tarif alınamadı:', error);
        return { success: false };
    }
}

async function filterRecipes(tag, difficulty) {
    try {
        const response = await fetch(`${API_BASE_URL}/recipes/filter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                etiket: tag,
                zorluk: difficulty
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Filtreleme hatası:', error);
        return { success: false, tarifler: [] };
    }
}

async function getMissingIngredients(recipeId) {
    try {
        const response = await fetch(`${API_BASE_URL}/recipes/${recipeId}/missing-ingredients`);
        return await response.json();
    } catch (error) {
        console.error('Eksik malzeme hatası:', error);
        return { success: false, eksik_malzemeler: [] };
    }
}

// ==================== AI MENÜ OPERASYONLARI ====================

async function createAIMenu() {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/create`, {
            method: 'GET'
        });
        return await response.json();
    } catch (error) {
        console.error('AI menü hatası:', error);
        return { success: false };
    }
}

async function createCustomMenu(ingredients) {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/create-custom`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ malzemeler: ingredients })
        });
        return await response.json();
    } catch (error) {
        console.error('Özel menü hatası:', error);
        return { success: false };
    }
}

// ==================== GÜNLÜK KAYIT OPERASYONLARI ====================

async function addDailyLog(mealName, calories) {
    try {
        const response = await fetch(`${API_BASE_URL}/daily-log/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                yemek_adi: mealName,
                kalori: calories
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Günlük kayıt hatası:', error);
        return { success: false };
    }
}

async function getDailyLogs() {
    try {
        const response = await fetch(`${API_BASE_URL}/daily-log`);
        return await response.json();
    } catch (error) {
        console.error('Günlük kayıt alınamadı:', error);
        return { success: false, kayitlar: [] };
    }
}

// ==================== YEDEKLEME ====================

async function createBackup() {
    try {
        const response = await fetch(`${API_BASE_URL}/backup`, {
            method: 'POST'
        });
        return await response.json();
    } catch (error) {
        console.error('Yedekleme hatası:', error);
        return { success: false };
    }
}
