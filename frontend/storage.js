const STORAGE_KEY = "smartrec_ingredients";
export function getIngredients() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}
export function saveIngredient(item) {
    const list = getIngredients();
    list.push(item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
export function deleteIngredient(id) {
    const list = getIngredients().filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
//# sourceMappingURL=storage.js.map