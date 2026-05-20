# @matthewp/cook-loader

An [Astro Content Layer](https://docs.astro.build/en/reference/content-loader-reference/) loader for [Cooklang](https://cooklang.org) `.cook` recipe files.

## Install

```sh
npm install @matthewp/cook-loader
```

Peer dependencies: `astro` (≥4.14, where the Content Layer landed) and `zod`.

## Usage

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { cooklang, recipeSchema } from '@matthewp/cook-loader';

const recipes = defineCollection({
  loader: cooklang({ base: 'src/content/recipes' }),
  schema: recipeSchema({
    metadata: z.object({
      title: z.string(),
      author: z.string().optional(),
      servings: z.coerce.number().optional(),
      emoji: z.string().optional(),
    }),
  }),
});

export const collections = { recipes };
```

Then in a page:

```astro
---
import { getCollection } from 'astro:content';
const recipes = await getCollection('recipes');
---
{recipes.map((r) => (
  <article>
    <h1>{r.data.metadata.title}</h1>
    <ul>
      {r.data.ingredients.map((i) => <li>{i.quantity} {i.units} {i.name}</li>)}
    </ul>
    {r.data.steps.map((step) => (
      <p>{step.map((t) => t.type === 'text' ? t.value : t.name)}</p>
    ))}
  </article>
))}
```

## Data shape

Each entry's `data` is:

```ts
{
  metadata: { /* your `>> key: value` lines, typed via your schema */ },
  ingredients: Array<{ name, quantity, units }>,
  cookware: Array<{ name, quantity }>,
  steps: Array<Array<StepToken>>,
}
```

Step tokens are a discriminated union of `text`, `ingredient`, `cookware`, and `timer`. Inline `ingredient`/`cookware` tokens carry an `index` field that points back to their position in the `ingredients`/`cookware` arrays — useful for rendering inline mentions as anchor links to ingredient list items.

## Schema extension

`recipeSchema()` owns the structural shape — `ingredients`, `cookware`, and the tokenised `steps`. The only extension point is `metadata`. Pass any Zod object for it; coerce types if you want:

```ts
recipeSchema({
  metadata: z.object({
    title: z.string(),
    servings: z.coerce.number(),
    tags: z.string().transform((s) => s.split(',').map((t) => t.trim())).optional(),
  }),
});
```

If you omit the `metadata` option you get `z.record(z.string(), z.string())`.

## Options

```ts
cooklang({
  base: 'src/content/recipes',  // directory to search (relative to project root)
  pattern: '**/*.cook',         // glob pattern relative to base
  generateId: (relPath) => relPath.replace(/\.cook$/, ''),  // custom id mapping
});
```

## License

BSD-3-Clause
