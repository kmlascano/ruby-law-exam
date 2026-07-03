import { randomUUID } from 'crypto';
import { extractText } from './extractorService';
import { callAI } from './aiService';
import { judgeAnalysis } from './judgeService';
import {
  clearContractAnalyses,
  deleteContractAnalysis,
  getCachedContractAnalysis,
  getContractAnalysisById,
  listContractAnalysisSummaries,
  saveContractAnalysis,
} from './contractStore';
import { createSha256Hash } from './hashService';
import type { ContractAnalysis, ContractAnalysisSummary } from '../types';

const DEFAULT_OPENAI_MODEL = 'gpt-5.4-nano';
const DEFAULT_ANALYSIS_VERSION = 'contract-analysis-v1';
const DEFAULT_PROMPT_VERSION = 'legal-risk-checklist-v1';

function shouldRunJudge(): boolean {
  return process.env.ENABLE_LLM_JUDGE === 'true';
}

function getAIProvider(): string {
  return (process.env.AI_PROVIDER ?? 'openai').trim().toLowerCase();
}

function getModelName(provider: string): string {
  if (provider === 'local') {
    return 'local-deterministic';
  }

  return process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
}

function getAnalysisVersion(): string {
  return process.env.CONTRACT_ANALYSIS_VERSION ?? DEFAULT_ANALYSIS_VERSION;
}

function getPromptVersion(): string {
  return process.env.CONTRACT_PROMPT_VERSION ?? DEFAULT_PROMPT_VERSION;
}

function createCacheKey(input: {
  documentHash: string;
  mimetype: string;
  aiProvider: string;
  modelName: string;
  analysisVersion: string;
  promptVersion: string;
  judgeEnabled: boolean;
}): string {
  return createSha256Hash(JSON.stringify(input));
}

function buildCachedRecord(cached: ContractAnalysis, filename: string): ContractAnalysis {
  const cachedFromAnalysisId = cached.cachedFromAnalysisId ?? cached.id;

  return {
    ...cached,
    id: randomUUID(),
    filename,
    createdAt: new Date().toISOString(),
    fromCache: true,
    cachedFromAnalysisId,
  };
}

export async function analyseContract(
  buffer: Buffer,
  mimetype: string,
  filename: string
): Promise<ContractAnalysis> {
  const documentHash = createSha256Hash(buffer);
  const aiProvider = getAIProvider();
  const modelName = getModelName(aiProvider);
  const analysisVersion = getAnalysisVersion();
  const promptVersion = getPromptVersion();
  const judgeEnabled = shouldRunJudge();
  const cacheKey = createCacheKey({
    documentHash,
    mimetype,
    aiProvider,
    modelName,
    analysisVersion,
    promptVersion,
    judgeEnabled,
  });

  const cached = getCachedContractAnalysis(cacheKey);

  if (cached) {
    const cachedRecord = buildCachedRecord(cached, filename);
    saveContractAnalysis(cachedRecord);
    return cachedRecord;
  }

  const text = await extractText(buffer, mimetype);
  const analysis = await callAI(text);
  const qualityReview = judgeEnabled ? await judgeAnalysis(text, analysis) : undefined;

  const record: ContractAnalysis = {
    id: randomUUID(),
    filename,
    ...analysis,
    ...(qualityReview ? { qualityReview } : {}),
    createdAt: new Date().toISOString(),
    fromCache: false,
    documentHash,
    cacheKey,
    analysisVersion,
    promptVersion,
    modelName,
    aiProvider,
  };

  saveContractAnalysis(record);
  return record;
}

export function listAnalysisHistory(): ContractAnalysisSummary[] {
  return listContractAnalysisSummaries();
}

export function getAnalysis(id: string): ContractAnalysis | null {
  return getContractAnalysisById(id);
}

export function deleteAnalysis(id: string): boolean {
  return deleteContractAnalysis(id);
}

export function clearAnalysisHistory(): number {
  return clearContractAnalyses();
}
