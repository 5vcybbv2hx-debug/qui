/**
 * recipeService.js
 * All Recipe + Article (ingredient) data access.
 */
import { entities } from '@/lib/serviceBase';

const R = entities.Recipe;
const A = entities.Article;

export const recipeService = {
    list:       (sort = 'name') => R.list(sort),
    byCategory: (cat)           => R.filter({ category: cat }, 'name'),
    get:        (id)            => R.filter({ id }).then(r => r[0] ?? null),
    create:     (data)          => R.create(data),
    update:     (id, data)      => R.update(id, data),
    delete:     (id)            => R.delete(id),

    /** Load all active articles (used for ingredient selection) */
    getIngredients: () => A.filter({ is_active: true }, 'name'),
};

// ── Cost calculation (pure business logic — no UI dependency) ─────────────────
/**
 * Calculate the total purchase cost of a recipe based on its ingredients
 * and current article prices.
 * @param {object[]} ingredients - Recipe.ingredients array
 * @param {object[]} articles    - All available articles
 * @returns {number} total cost in EUR
 */
export function calcRecipeCost(ingredients = [], articles = []) {
    return ingredients.reduce((sum, ing) => {
        const article = articles.find(a => a.id === ing.article_id);
        if (!article?.price_per_liter || !ing.amount) return sum;

        const unit = (ing.unit || 'ml').toLowerCase();
        let liters = 0;
        if      (unit === 'ml')  liters = ing.amount / 1000;
        else if (unit === 'cl')  liters = ing.amount / 100;
        else if (unit === 'l')   liters = ing.amount;
        else if (unit === 'g')   liters = ing.amount / 1000;
        else if (unit === 'kg')  liters = ing.amount;
        else if (unit.startsWith('st')) {
            return sum + (article.purchase_price ?? 0) * ing.amount;
        }

        return sum + liters * article.price_per_liter;
    }, 0);
}

/** Derive margin stats from selling price + cost */
export function calcMargin(price, cost) {
    if (!price || price <= 0) return { marginEur: 0, marginPct: 0, markup: 0 };
    const marginEur = price - cost;
    const marginPct = (marginEur / price) * 100;
    const markup    = cost > 0 ? (marginEur / cost) * 100 : 0;
    return { marginEur, marginPct, markup };
}