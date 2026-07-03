import fs from 'fs';
import path from 'path';
import type { ContractAnalysis, ContractAnalysisSummary } from '../types';

type PersistedContractStore = {
  analyses: ContractAnalysis[];
  cacheIndex: Array<[string, string]>;
};

const DEFAULT_STORE_PATH = path.resolve(process.cwd(), '.data', 'contract-analyses.json');

// The exported map is kept for compatibility with the existing codebase/tests.
export const contractStore = new Map<string, ContractAnalysis>();

const cacheStore = new Map<string, string>();
let hasHydrated = false;

function getStorePath(): string {
  return process.env.CONTRACT_STORE_FILE ?? DEFAULT_STORE_PATH;
}

function ensureHydrated(): void {
  if (hasHydrated) {
    return;
  }

  hasHydrated = true;
  const storePath = getStorePath();

  if (!fs.existsSync(storePath)) {
    return;
  }

  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedContractStore>;

    contractStore.clear();
    cacheStore.clear();

    for (const record of parsed.analyses ?? []) {
      if (typeof record.id === 'string') {
        contractStore.set(record.id, record);
      }
    }

    for (const [cacheKey, analysisId] of parsed.cacheIndex ?? []) {
      if (typeof cacheKey === 'string' && typeof analysisId === 'string' && contractStore.has(analysisId)) {
        cacheStore.set(cacheKey, analysisId);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[CONTRACT_STORE_HYDRATE_FAILED]', message);
  }
}

function persistStore(): void {
  const storePath = getStorePath();

  try {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });

    const payload: PersistedContractStore = {
      analyses: Array.from(contractStore.values()),
      cacheIndex: Array.from(cacheStore.entries()),
    };

    fs.writeFileSync(storePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[CONTRACT_STORE_PERSIST_FAILED]', message);
  }
}

function cloneAnalysis(record: ContractAnalysis): ContractAnalysis {
  return JSON.parse(JSON.stringify(record)) as ContractAnalysis;
}

export function getCachedContractAnalysis(cacheKey: string): ContractAnalysis | null {
  ensureHydrated();

  const analysisId = cacheStore.get(cacheKey);

  if (!analysisId) {
    return null;
  }

  const record = contractStore.get(analysisId);
  return record ? cloneAnalysis(record) : null;
}

export function getContractAnalysisById(id: string): ContractAnalysis | null {
  ensureHydrated();

  const record = contractStore.get(id);
  return record ? cloneAnalysis(record) : null;
}

export function saveContractAnalysis(record: ContractAnalysis): void {
  ensureHydrated();

  contractStore.set(record.id, cloneAnalysis(record));

  if (record.cacheKey && !record.fromCache) {
    cacheStore.set(record.cacheKey, record.id);
  }

  if (record.cacheKey && !cacheStore.has(record.cacheKey)) {
    cacheStore.set(record.cacheKey, record.cachedFromAnalysisId ?? record.id);
  }

  persistStore();
}

export function deleteContractAnalysis(id: string): boolean {
  ensureHydrated();

  const existing = contractStore.get(id);

  if (!existing) {
    return false;
  }

  contractStore.delete(id);

  for (const [cacheKey, analysisId] of cacheStore.entries()) {
    if (analysisId === id) {
      cacheStore.delete(cacheKey);
    }
  }

  if (existing.cacheKey && existing.fromCache !== true) {
    cacheStore.delete(existing.cacheKey);
  }

  persistStore();
  return true;
}

export function clearContractAnalyses(): number {
  ensureHydrated();

  const deletedCount = contractStore.size;

  contractStore.clear();
  cacheStore.clear();
  persistStore();

  return deletedCount;
}

export function listContractAnalysisSummaries(): ContractAnalysisSummary[] {
  ensureHydrated();

  return Array.from(contractStore.values())
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .map((record) => ({
      id: record.id,
      filename: record.filename,
      type: record.type,
      riskScore: record.riskScore,
      createdAt: record.createdAt,
      fromCache: record.fromCache,
      cachedFromAnalysisId: record.cachedFromAnalysisId,
      documentHash: record.documentHash,
      cacheKey: record.cacheKey,
      analysisVersion: record.analysisVersion,
      promptVersion: record.promptVersion,
      modelName: record.modelName,
      aiProvider: record.aiProvider,
      qualityScore: record.qualityReview?.qualityScore,
      qualityReviewStatus: record.qualityReview?.status,
    }));
}
