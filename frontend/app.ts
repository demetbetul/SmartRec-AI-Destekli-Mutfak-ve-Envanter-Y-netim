interface Malzeme {
    isim: string;
    miktar: number;
    birim: string; // Gram, adet gibi
    skt: string;   // Son kullanma tarihi
}
async function tarifleriGetir() {
    try {
        // Önce internetteki (TheMealDB) gerçek tarifleri deniyoruz [cite: 19]
        const response = await fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=');
        if (!response.ok) throw new Error("API'ye ulaşılamıyor");
        const data = await response.json();
        console.log("Tarifler internetten çekildi.");
        return data;
    } catch (error) {
        // İnternet yoksa senin oluşturduğun 'yedek_veriler.json' devreye girer 
        console.warn("İnternet hatası! Yerel yedek dosya kullanılıyor...");
        const localResponse = await fetch('../data/yedek_veriler.json');
        return await localResponse.json();
    }
}
function envanterKontrolEt(liste: Malzeme[]) {
    const bugun = new Date().toISOString().split('T')[0]; // Bugünün tarihini alıyoruz

    liste.forEach(urun => {
        if (urun.skt < bugun) {
            alert(`DİKKAT: ${urun.isim} ürününün tarihi geçmiş! İsrafı önlemek için kontrol et.`); [cite: 13]
        }
    });
}
function bozukUrunKontrolu(envanter: Malzeme[]) {
    const bugun = new Date().toISOString().split('T')[0];
    
    envanter.forEach(urun => {
        if (urun.skt < bugun) {
            console.log(`DİKKAT: ${urun.isim} bozulmuş olabilir!`); // 
        }
    });
}