/**
 * recipeSchema.js
 * Zod schema for recipe create / edit forms.
 */
import { z } from 'zod';

const IngredientSchema = z.object({
    article_id:   z.string().min(1, 'Artikel erforderlich'),
    article_name: z.string().min(1),
    amount:       z.coerce.number().positive('Menge muss > 0 sein'),
    unit:         z.enum(['ml', 'cl', 'l', 'g', 'kg', 'Stk'], { required_error: 'Einheit wählen' }),
});

export const RecipeSchema = z.object({
    name:         z.string().min(2, 'Name muss mind. 2 Zeichen haben').max(100),
    category:     z.enum(
                    ['Cocktail', 'Longdrink', 'Shot', 'Mocktail', 'Moonshiner-Cocktails', 'Sonstiges'],
                    { required_error: 'Kategorie wählen' }
                  ),
    servings:     z.coerce.number().min(1).max(50).int().default(1),
    ingredients:  z.array(IngredientSchema)
                   .min(1, 'Mind. eine Zutat erforderlich'),
    preparation:  z.string().max(2000).optional().or(z.literal('')),
    glass_type:   z.string().max(60).optional().or(z.literal('')),
    garnish:      z.string().max(100).optional().or(z.literal('')),
    notes:        z.string().max(500).optional().or(z.literal('')),
    image_url:    z.string().url('Ungültige URL').optional().or(z.literal('')),
});

export const RECIPE_DEFAULTS = {
    name: '', category: 'Cocktail', servings: 1,
    ingredients: [], preparation: '', glass_type: '',
    garnish: '', notes: '', image_url: '',
};