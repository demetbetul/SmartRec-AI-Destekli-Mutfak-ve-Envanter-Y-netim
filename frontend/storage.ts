import type { Ingredient } from './types.js';

const STORAGE_KEY = "smartrec_ingredients";

export function getIngredients(): Ingredient[] { // export ekledik
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveIngredient(item: Ingredient): void { // export ekledik
  const list = getIngredients();
  list.push(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function deleteIngredient(id: string): void { // export ekledik
  const list = getIngredients().filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}