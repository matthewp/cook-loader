import { Recipe } from '@cooklang/cooklang-ts';
import type { ParsedRecipe, StepToken } from './types.js';

export function parseCooklang(source: string): ParsedRecipe {
  const recipe = new Recipe(source);

  let ingredientCursor = 0;
  let cookwareCursor = 0;

  const steps: StepToken[][] = recipe.steps.map((step) =>
    step.map((token): StepToken => {
      if (token.type === 'ingredient') {
        return {
          type: 'ingredient',
          name: token.name,
          quantity: token.quantity,
          units: token.units,
          index: ingredientCursor++,
        };
      }
      if (token.type === 'cookware') {
        return {
          type: 'cookware',
          name: token.name,
          quantity: token.quantity,
          index: cookwareCursor++,
        };
      }
      if (token.type === 'timer') {
        return {
          type: 'timer',
          name: token.name ?? '',
          quantity: token.quantity,
          units: token.units,
        };
      }
      return { type: 'text', value: token.value };
    }),
  );

  return {
    metadata: recipe.metadata as Record<string, string>,
    ingredients: recipe.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      units: i.units,
    })),
    cookware: recipe.cookwares.map((c) => ({
      name: c.name,
      quantity: c.quantity,
    })),
    steps,
  };
}
