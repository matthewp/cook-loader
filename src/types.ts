export type IngredientQuantity = number | string;

export interface CookIngredient {
  name: string;
  quantity: IngredientQuantity;
  units: string;
}

export interface CookCookware {
  name: string;
  quantity: IngredientQuantity;
}

export interface TextToken {
  type: 'text';
  value: string;
}

export interface IngredientToken {
  type: 'ingredient';
  name: string;
  quantity: IngredientQuantity;
  units: string;
  /** Position in the recipe's `ingredients` array — useful for anchor links. */
  index: number;
}

export interface CookwareToken {
  type: 'cookware';
  name: string;
  quantity: IngredientQuantity;
  /** Position in the recipe's `cookware` array. */
  index: number;
}

export interface TimerToken {
  type: 'timer';
  name: string;
  quantity: IngredientQuantity;
  units: string;
}

export type StepToken = TextToken | IngredientToken | CookwareToken | TimerToken;

export interface ParsedRecipe<TMetadata extends Record<string, unknown> = Record<string, string>> {
  metadata: TMetadata;
  ingredients: CookIngredient[];
  cookware: CookCookware[];
  steps: StepToken[][];
}
