export interface Ingredient {
    id: string;
    name: string;
    expiryDate: string;
    quantity?: string;
}

export interface Recipe {
    title: string;
    category: "starter" | "main" | "dessert";
    ingredients: string[];
    instructions: string;
    calories?: number;
}