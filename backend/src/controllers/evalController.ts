import { Router } from 'express';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const evalRouter = Router();

const backendRoot = path.join(process.cwd(), 'backend');
const evalRoot = path.join(backendRoot, 'eval');
const casesPath = path.join(evalRoot, 'contract-eval-cases.json');
const resultsDir = path.join(evalRoot, 'results');

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

evalRouter.get('/', async (_req, res, next) => {
  try {
    const cases = (await readJson<unknown[]>(casesPath)) ?? [];

    let resultFiles: string[] = [];

    try {
      resultFiles = await readdir(resultsDir);
    } catch {
      resultFiles = [];
    }

    const results = [];

    for (const filename of resultFiles.filter((file) => file.endsWith('.json')).sort().reverse()) {
      const filePath = path.join(resultsDir, filename);
      const fileStat = await stat(filePath);
      const parsed = await readJson<Record<string, unknown>>(filePath);

      if (!parsed) continue;

      results.push({
        filename,
        createdAt: fileStat.mtime.toISOString(),
        ...parsed,
      });
    }

    res.json({
      data: {
        cases,
        results,
        latest: results[0] ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});