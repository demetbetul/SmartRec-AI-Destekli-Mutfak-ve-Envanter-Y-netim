import { getIngredients, saveIngredient } from './storage';

console.log("SmartRec Sistemi Hazır!");

// Test etmek istersen:
const liste = getIngredients();
console.log("Mevcut Malzemeler:", liste);