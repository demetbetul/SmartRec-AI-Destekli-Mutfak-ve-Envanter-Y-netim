/**
 * SmartRec - Ana Arayüz Etkileşim Modülü
 * Görev: DOM etkileşimleri, event listeners, UI güncellemeleri
 */

// ==================== DOM ELEMANLARI ====================

const chatbotFab = document.getElementById('chatbotFab');
const chatbotModal = document.getElementById('chatbotModal');
const chatbotClose = document.getElementById('chatbotClose');
const chatbotBody = document.getElementById('chatbotBody');
const chatbotInput = document.getElementById('chatbotInput');
const chatbotSend = document.getElementById('chatbotSend');

const hamburger = document.getElementById('hamburger');
const header = document.getElementById('header');

const inventoryCount = document.getElementById('inventoryCount');
const searchInput = document.getElementById('searchInput');

// ==================== CHATBOT FONKSİYONALİTESİ ====================

function openChatbot() {
    chatbotModal.setAttribute('aria-hidden', 'false');
    chatbotModal.style.display = 'flex';
}

function closeChatbot() {
    chatbotModal.setAttribute('aria-hidden', 'true');
    chatbotModal.style.display = 'none';
}

function addBotMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-msg chat-msg--bot';
    messageDiv.innerHTML = `<p>${text}</p>`;
    chatbotBody.appendChild(messageDiv);
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
}

function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-msg chat-msg--user';
    messageDiv.innerHTML = `<p>${text}</p>`;
    chatbotBody.appendChild(messageDiv);
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
}

async function handleChatbotMessage() {
    const message = chatbotInput.value.trim();
    
    if (!message) return;
    
    addUserMessage(message);
    chatbotInput.value = '';
    
    // Simulate AI response - replace with actual API call
    addBotMessage('İsteğinizi işliyorum... 🤔');
    
    // TODO: POST /api/chat with message
}

// ==================== ENVANTER YÖNETİMİ ====================

async function loadInventory() {
    const data = await getInventory();
    
    if (data.success) {
        updateInventoryCount(data.count);
        displayInventoryItems(data.envanter);
    }
}

function updateInventoryCount(count) {
    if (inventoryCount) {
        inventoryCount.textContent = count;
    }
}

function displayInventoryItems(items) {
    // TODO: Implement inventory display
    console.log('Envanter öğeleri:', items);
}

// ==================== ARAMA FONKSİYONALİTESİ ====================

async function handleSearch(query) {
    if (!query.trim()) return;
    
    console.log('Arama yapılıyor:', query);
    
    // TODO: GET /api/recipes/search?q={query}
}

// ==================== NAVİGASYON ====================

function toggleHamburger() {
    header.classList.toggle('header--mobile-menu-open');
}

// ==================== EVENT LİSTENERS ====================

// Chatbot
chatbotFab?.addEventListener('click', openChatbot);
chatbotClose?.addEventListener('click', closeChatbot);
chatbotSend?.addEventListener('click', handleChatbotMessage);
chatbotInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatbotMessage();
});

// Hamburger Menu
hamburger?.addEventListener('click', toggleHamburger);

// Search
searchInput?.addEventListener('input', (e) => {
    handleSearch(e.target.value);
});

// Open Piti from banner
document.getElementById('openPitiBanner')?.addEventListener('click', openChatbot);
document.getElementById('openPiti')?.addEventListener('click', (e) => {
    e.preventDefault();
    openChatbot();
});

// ==================== SAYFA YÜKÜ ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('SmartRec yükleniyor... 🍽');
    
    loadInventory();
    
    // Health check
    fetch('http://localhost:5000/api/health')
        .then(r => r.json())
        .then(data => console.log('✅ Backend bağlantısı:', data))
        .catch(e => console.error('❌ Backend hatası:', e));
});
