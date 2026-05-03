// =============================================
// data.js — Mock data (replace with API calls)
// TODO: All data here will come from FastAPI endpoints
// =============================================

const RECIPES = [
  {
    id: 1,
    title: "Menemen",
    desc: "Domates, biber ve yumurta ile hazırlanan klasik Türk kahvaltısı.",
    emoji: "🍳",
    category: ["kolay", "geleneksel"],
    calories: 320,
    time: 15,
    flavorScore: 9.2,
    tags: ["Kahvaltı", "Kolay"],
    tagTypes: ["", "green"],
  },
  {
    id: 2,
    title: "Mercimek Çorbası",
    desc: "Kırmızı mercimekten yapılan, nane ve kırmızı biberle tatlandırılmış geleneksel çorba.",
    emoji: "🍲",
    category: ["saglikli", "geleneksel", "vejetaryen"],
    calories: 210,
    time: 30,
    flavorScore: 9.5,
    tags: ["Vegan", "Geleneksel"],
    tagTypes: ["green", ""],
  },
  {
    id: 3,
    title: "Fırın Tavuk",
    desc: "Baharatlarla marine edilmiş, fırında pişirilmiş tam tavuk. Yanında patates kızartması ile servis edilir.",
    emoji: "🍗",
    category: ["kolay"],
    calories: 480,
    time: 60,
    flavorScore: 8.8,
    tags: ["Akşam Yemeği", "Protein"],
    tagTypes: ["", "green"],
  },
  {
    id: 4,
    title: "Tabbouleh Salatası",
    desc: "Maydanoz, nane, domates ve bulgur ile hazırlanan ferahlatıcı Levant salatası.",
    emoji: "🥗",
    category: ["saglikli", "vejetaryen"],
    calories: 180,
    time: 20,
    flavorScore: 8.4,
    tags: ["Sağlıklı", "Vejetaryen"],
    tagTypes: ["green", "green"],
  },
  {
    id: 5,
    title: "İmam Bayıldı",
    desc: "Zeytinyağlı patlıcan dolması. Soğan, domates ve sarımsak ile doldurulmuş geleneksel Türk yemeği.",
    emoji: "🍆",
    category: ["geleneksel", "vejetaryen"],
    calories: 260,
    time: 45,
    flavorScore: 9.7,
    tags: ["Geleneksel", "Vegan"],
    tagTypes: ["", "green"],
  },
  {
    id: 6,
    title: "Sütlaç",
    desc: "Fırında pişirilmiş sütlü pirinç muhallebisi. Tarçın ve gül suyu ile tatlandırılmış.",
    emoji: "🍮",
    category: ["tatli"],
    calories: 290,
    time: 50,
    flavorScore: 9.0,
    tags: ["Tatlı", "Geleneksel"],
    tagTypes: ["", ""],
  },
  {
    id: 7,
    title: "Zeytinyağlı Fasulye",
    desc: "Taze bakla ve domates ile pişirilen zeytinyağlı Türk yemeği.",
    emoji: "🫘",
    category: ["saglikli", "geleneksel", "vejetaryen"],
    calories: 195,
    time: 35,
    flavorScore: 8.6,
    tags: ["Vegan", "Sağlıklı"],
    tagTypes: ["green", "green"],
  },
  {
    id: 8,
    title: "Döner Wrap",
    desc: "Lavaş ekmeğinde döner eti, cacık sosu ve sebzeler.",
    emoji: "🌯",
    category: ["kolay"],
    calories: 420,
    time: 10,
    flavorScore: 8.9,
    tags: ["Hızlı", "Sokak Lezzeti"],
    tagTypes: ["green", ""],
  },
];

// TODO: Replace with GET /api/inventory?userId={id}
const INVENTORY = [
  { id: 1, name: "Domates", qty: "6 adet", expiry: "2025-07-05", status: "green" },
  { id: 2, name: "Yumurta", qty: "12 adet", expiry: "2025-07-10", status: "green" },
  { id: 3, name: "Süt", qty: "1 L", expiry: "2025-07-03", status: "orange" },
  { id: 4, name: "Tereyağı", qty: "200 g", expiry: "2025-07-02", status: "red" },
  { id: 5, name: "Kırmızı Biber", qty: "4 adet", expiry: "2025-07-08", status: "green" },
  { id: 6, name: "Patlıcan", qty: "2 adet", expiry: "2025-07-04", status: "orange" },
  { id: 7, name: "Mercimek", qty: "500 g", expiry: "2026-01-01", status: "green" },
  { id: 8, name: "Tavuk Göğsü", qty: "400 g", expiry: "2025-07-02", status: "red" },
  { id: 9, name: "Soğan", qty: "3 adet", expiry: "2025-07-20", status: "green" },
  { id: 10, name: "Sarımsak", qty: "1 baş", expiry: "2025-07-25", status: "green" },
];

// TODO: Replace with GET /api/shopping-list?userId={id}
const SHOPPING_LIST = [
  { id: 1, name: "Un", qty: "1 kg", done: false },
  { id: 2, name: "Zeytinyağı", qty: "500 ml", done: false },
  { id: 3, name: "Yoğurt", qty: "2 kap", done: true },
  { id: 4, name: "Limon", qty: "4 adet", done: false },
  { id: 5, name: "Maydanoz", qty: "1 demet", done: false },
];

// TODO: Replace with POST /api/recipes/suggest { inventory: [...] }
const SUGGESTIONS = [
  { id: 1, name: "Menemen", emoji: "🍳", time: 15, calories: 320 },
  { id: 2, name: "Fırın Tavuk", emoji: "🍗", time: 60, calories: 480 },
  { id: 3, name: "Mercimek Çorbası", emoji: "🍲", time: 30, calories: 210 },
];

// TODO: Replace with GET /api/notifications?userId={id}
const NOTIFICATIONS = [
  {
    type: "warn",
    icon: "⚠️",
    title: "SKT Uyarısı",
    text: "Tereyağı ve Tavuk Göğsü bugün son kullanma tarihine ulaşıyor!"
  },
  {
    type: "info",
    icon: "💡",
    title: "Tarif Önerisi",
    text: "Elinizdeki malzemelerle 3 farklı tarif yapabilirsiniz."
  },
  {
    type: "tip",
    icon: "🔥",
    title: "Kalori Hedefi",
    text: "Bugün 580 kcal daha tüketebilirsiniz. Hafif bir akşam yemeği öneririz."
  },
];

// Weekly calorie data for chart
// TODO: Replace with GET /api/nutrition/weekly?userId={id}
const WEEKLY_CALORIES = {
  labels: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"],
  data: [1850, 2100, 1750, 1900, 1420, 0, 0],
  goal: 2000,
};
