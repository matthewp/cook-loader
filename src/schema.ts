import { z } from 'astro/zod';

interface AnyZodSchema {
  readonly _zod: unknown;
  parse(input: unknown): unknown;
  safeParse(input: unknown): { success: boolean };
}

const quantity = z.union([z.number(), z.string()]);

const ingredient = z.object({
  name: z.string(),
  quantity,
  units: z.string(),
});

const cookware = z.object({
  name: z.string(),
  quantity,
});

const stepToken = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), value: z.string() }),
  z.object({
    type: z.literal('ingredient'),
    name: z.string(),
    quantity,
    units: z.string(),
    index: z.number(),
  }),
  z.object({
    type: z.literal('cookware'),
    name: z.string(),
    quantity,
    index: z.number(),
  }),
  z.object({
    type: z.literal('timer'),
    name: z.string(),
    quantity,
    units: z.string(),
  }),
]);

const defaultMetadata = z.record(z.string(), z.string());

/**
 * Build a Zod schema for a recipe entry. The structural shape — ingredients,
 * cookware, and tokenised steps — is always validated by the loader. The
 * `metadata` block is the extension point: pass a Zod schema describing the
 * `>>` metadata keys you care about (with whatever coercions you want).
 *
 * @example
 * recipeSchema({
 *   metadata: z.object({
 *     title: z.string(),
 *     servings: z.coerce.number().optional(),
 *     emoji: z.string().optional(),
 *   }),
 * });
 */
export function recipeSchema<M extends AnyZodSchema = typeof defaultMetadata>(
  options: { metadata?: M } = {},
) {
  const metadata = (options.metadata ?? defaultMetadata) as M;
  return z.object({
    metadata,
    ingredients: z.array(ingredient),
    cookware: z.array(cookware),
    steps: z.array(z.array(stepToken)),
  });
}

export const tokenSchema = stepToken;
export const ingredientSchema = ingredient;
export const cookwareSchema = cookware;
