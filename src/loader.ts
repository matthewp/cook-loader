import type { Loader } from 'astro/loaders';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCooklang } from './parse.js';

export interface CooklangLoaderOptions {
  /**
   * Glob pattern (relative to `base`) matching .cook files. Defaults to `**\/*.cook`.
   * Supported tokens: `**\/` (zero or more segments), `**` (anything), `*` (any
   * chars in one segment), `?` (any single char in one segment).
   */
  pattern?: string;
  /**
   * Directory to search, resolved relative to the Astro project root.
   * Defaults to `src/content/recipes`.
   */
  base?: string;
  /**
   * Optional override for how an entry's id is derived from its file path
   * (relative to `base`, without extension by default).
   */
  generateId?: (relativePath: string) => string;
}

function defaultId(relative: string): string {
  return relative.replace(/\.cook$/, '').replace(/\\/g, '/');
}

function matchesPattern(relative: string, pattern: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\?/g, '[^/]')
    .replace(/\*\*\//g, '__DSS__')
    .replace(/\*\*/g, '__DS__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DSS__/g, '(?:.*/)?')
    .replace(/__DS__/g, '.*');
  const re = new RegExp(`^${escaped}$`);
  return re.test(relative.replace(/\\/g, '/'));
}

async function walk(dir: string): Promise<string[]> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.name.endsWith('.cook')) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Astro Content Layer loader for Cooklang (.cook) recipe files.
 *
 * @example
 * import { defineCollection } from 'astro:content';
 * import { cooklang, recipeSchema } from '@matthewp/cook-loader';
 *
 * export const collections = {
 *   recipes: defineCollection({
 *     loader: cooklang({ base: 'src/content/recipes' }),
 *     schema: recipeSchema(),
 *   }),
 * };
 */
export function cooklang(options: CooklangLoaderOptions = {}): Loader {
  const pattern = options.pattern ?? '**/*.cook';
  const baseOption = options.base ?? 'src/content/recipes';
  const generateId = options.generateId ?? defaultId;

  return {
    name: '@matthewp/cook-loader',
    async load({ store, logger, generateDigest, watcher, config, parseData }) {
      const root = (config as unknown as { root: URL }).root;
      const baseDir = path.resolve(fileURLToPath(root), baseOption);

      const loadFile = async (file: string) => {
        const relative = path.relative(baseDir, file).replace(/\\/g, '/');
        if (!matchesPattern(relative, pattern)) return false;
        const raw = await fs.readFile(file, 'utf-8');
        try {
          const data = parseCooklang(raw);
          const id = generateId(relative);
          const filePath = path.relative(fileURLToPath(root), file);
          const parsed = await parseData({
            id,
            data: data as unknown as Record<string, unknown>,
            filePath,
          });
          store.set({
            id,
            data: parsed,
            digest: generateDigest(raw),
            filePath,
          });
          return true;
        } catch (err) {
          logger.error(`Failed to parse ${relative}: ${(err as Error).message}`);
          return false;
        }
      };

      const removeFile = (file: string) => {
        const relative = path.relative(baseDir, file).replace(/\\/g, '/');
        const id = generateId(relative);
        store.delete(id);
      };

      const files = await walk(baseDir);
      const seen = new Set<string>();
      let loaded = 0;
      for (const file of files) {
        const relative = path.relative(baseDir, file).replace(/\\/g, '/');
        if (!matchesPattern(relative, pattern)) continue;
        seen.add(generateId(relative));
        if (await loadFile(file)) loaded++;
      }
      for (const key of store.keys()) {
        if (!seen.has(key)) store.delete(key);
      }
      logger.info(`Loaded ${loaded} .cook recipe(s) from ${baseOption}`);

      if (watcher) {
        const inBase = (p: string) => p.startsWith(baseDir + path.sep) || p === baseDir;
        const isCook = (p: string) => p.endsWith('.cook');
        watcher.on('change', (p) => {
          if (inBase(p) && isCook(p)) {
            logger.info(`Reloading ${path.relative(baseDir, p)}`);
            void loadFile(p);
          }
        });
        watcher.on('add', (p) => {
          if (inBase(p) && isCook(p)) void loadFile(p);
        });
        watcher.on('unlink', (p) => {
          if (inBase(p) && isCook(p)) removeFile(p);
        });
      }
    },
  };
}
