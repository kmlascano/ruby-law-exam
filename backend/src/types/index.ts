import type { ContractAIResult, JudgeReview } from '../schemas/contractAnalysisSchema';

export type { ContractAIResult, ContractType, JudgeReview } from '../schemas/contractAnalysisSchema';

export type Evidence = ContractAIResult['classification']['evidence'][number];
export type ClauseCheck = ContractAIResult['clauseChecks'][number];
export type RiskFlag = ContractAIResult['riskFlags'][number];
export type Severity = RiskFlag['severity'];

export interface ContractAnalysis extends ContractAIResult {
  id: string;
  filename: string;
  createdAt: string;
  qualityReview?: JudgeReview;
  fromCache?: boolean;
  cachedFromAnalysisId?: string;
  documentHash?: string;
  cacheKey?: string;
  analysisVersion?: string;
  promptVersion?: string;
  modelName?: string;
  aiProvider?: string;
}

export interface ContractAnalysisSummary {
  id: string;
  filename: string;
  type: ContractAIResult['type'];
  riskScore: number;
  createdAt: string;
  fromCache?: boolean;
  cachedFromAnalysisId?: string;
  documentHash?: string;
  cacheKey?: string;
  analysisVersion?: string;
  promptVersion?: string;
  modelName?: string;
  aiProvider?: string;
  qualityScore?: number;
  qualityReviewStatus?: string;
}
