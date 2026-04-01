/**
 * useRecipes.js
 * React Query hooks for the Recipes feature.
 * Cost calculation logic is imported from the service — not repeated in JSX.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { recipeService, calcRecipeCost, calcMargin } from '../services/recipeService';
import { toast } from 'sonner';

export const RECIPE_KEYS = {
    all:        ['recipes'],
    byCategory: (cat) => ['recipes', 'cat', cat],
    detail:     (id)  => ['recipes', id],
    ingredients:       ['recipes', 'ingredients'],
};

export function useRecipes() {
    return useQuery({
        queryKey: RECIPE_KEYS.all,
        queryFn:  recipeService.list,
        staleTime: 10 * 60_000,
    });
}

export function useRecipesByCategory(category) {
    return useQuery({
        queryKey: RECIPE_KEYS.byCategory(category),
        queryFn:  () => recipeService.byCategory(category),
        enabled:  !!category,
    });
}

export function useRecipe(id) {
    return useQuery({
        queryKey: RECIPE_KEYS.detail(id),
        queryFn:  () => recipeService.get(id),
        enabled:  !!id,
    });
}

/** All articles usable as recipe ingredients */
export function useRecipeIngredients() {
    return useQuery({
        queryKey: RECIPE_KEYS.ingredients,
        queryFn:  recipeService.getIngredients,
        staleTime: 15 * 60_000,
    });
}

/**
 * Returns cost + margin for a given ingredient list.
 * Memoised so it only recalculates when ingredients or articles change.
 */
export function useRecipeCost(ingredients, sellingPrice) {
    const { data: articles = [] } = useRecipeIngredients();
    return useMemo(() => {
        const cost = calcRecipeCost(ingredients, articles);
        return { cost, ...calcMargin(sellingPrice, cost) };
    }, [ingredients, articles, sellingPrice]);
}

export function useCreateRecipe() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: recipeService.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: RECIPE_KEYS.all });
            toast.success('Rezept gespeichert');
        },
    });
}

export function useUpdateRecipe() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => recipeService.update(id, data),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: RECIPE_KEYS.all });
            qc.invalidateQueries({ queryKey: RECIPE_KEYS.detail(id) });
            toast.success('Rezept aktualisiert');
        },
    });
}

export function useDeleteRecipe() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: recipeService.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: RECIPE_KEYS.all });
            toast.success('Rezept gelöscht');
        },
    });
}