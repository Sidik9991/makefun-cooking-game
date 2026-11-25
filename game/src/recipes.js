// Ember Pass Kitchen — the recipe book: 12 dishes from 8 ingredients.
// One job: what a dish is, what it needs, and whether a pile of ingredients
// (chopped where the recipe demands it) is that dish, no more and no less.

import { INGREDIENT_BY_ID } from './config.js';

export const RECIPES = [
  { id: 'garden-salad', name: 'Garden Salad', needs: ['lettuce', 'tomato', 'carrot'], chop: ['lettuce', 'tomato', 'carrot'], cookSeconds: 0 },
  { id: 'tomato-soup', name: 'Tomato Soup', needs: ['tomato', 'onion'], chop: ['tomato', 'onion'], cookSeconds: 6 },
  { id: 'mushroom-soup', name: 'Mushroom Soup', needs: ['mushroom', 'onion'], chop: ['mushroom', 'onion'], cookSeconds: 6 },
  { id: 'carrot-soup', name: 'Carrot Soup', needs: ['carrot', 'onion'], chop: ['carrot', 'onion'], cookSeconds: 6 },
  { id: 'cheese-omelette', name: 'Cheese Omelette', needs: ['egg', 'cheese'], chop: [], cookSeconds: 5 },
  { id: 'golden-omelette', name: 'Golden Omelette', needs: ['egg', 'cheese', 'mushroom'], chop: ['mushroom'], cookSeconds: 7 },
  { id: 'mushroom-pasta', name: 'Mushroom Pasta', needs: ['pasta', 'mushroom', 'cheese'], chop: ['mushroom'], cookSeconds: 8 },
  { id: 'tomato-pasta', name: 'Tomato Pasta', needs: ['pasta', 'tomato', 'cheese'], chop: ['tomato'], cookSeconds: 8 },
  { id: 'veggie-stirfry', name: 'Veggie Stir-fry', needs: ['carrot', 'mushroom', 'onion'], chop: ['carrot', 'mushroom', 'onion'], cookSeconds: 7 },
  { id: 'cheesy-tomato-bake', name: 'Cheesy Tomato Bake', needs: ['tomato', 'cheese', 'egg'], chop: ['tomato'], cookSeconds: 9 },
  { id: 'egg-fried-pasta', name: 'Egg Fried Pasta', needs: ['pasta', 'egg', 'onion'], chop: ['onion'], cookSeconds: 8 },
  { id: 'mushroom-salad', name: 'Mushroom Salad', needs: ['mushroom', 'lettuce', 'tomato'], chop: ['mushroom', 'lettuce', 'tomato'], cookSeconds: 0 },
];

export const RECIPE_BY_ID = new Map(RECIPES.map((recipe) => [recipe.id, recipe]));

/** A carried or potted ingredient: its id and whether it has been chopped. */
export function makeIngredient(id, chopped = false) {
  return { kind: 'ingredient', id, chopped };
}

/** A finished dish, ready to plate or serve. */
export function makeDish(recipeId) {
  return { kind: 'dish', id: recipeId };
}

/**
 * The recipe a pile of ingredients is, or null: same ids, same count, and every
 * ingredient the recipe wants chopped is chopped. Salads (cookSeconds 0) are
 * finished the moment their pile is complete; cooked dishes still need a burner.
 */
export function matchRecipe(items) {
  if (items.length < 2) return null;
  const ids = items.map((item) => item.id).sort();
  for (const recipe of RECIPES) {
    const needs = [...recipe.needs].sort();
    if (needs.length !== ids.length) continue;
    if (!needs.every((id, i) => id === ids[i])) continue;
    const choppedOk = recipe.chop.every((id) => items.some((item) => item.id === id && item.chopped));
    if (!choppedOk) return null;
    return recipe;
  }
  return null;
}

/** Whether adding this ingredient could still become some recipe (no dead piles). */
export function couldBecomeRecipe(items) {
  return RECIPES.some((recipe) => {
    const pool = [...recipe.needs];
    return items.every((item) => {
      const at = pool.indexOf(item.id);
      if (at < 0) return false;
      pool.splice(at, 1);
      return true;
    });
  });
}

/** Short name for a ticket and the plate: the dish, or its ingredients so far. */
export function describePile(items) {
  return items.map((item) => INGREDIENT_BY_ID.get(item.id)?.name ?? item.id).join(' + ');
}
