export type ContractType = 'NDA' | 'Employment' | 'Service Agreement' | 'Lease' | 'Other';

export type Severity = 'low' | 'medium' | 'high';

export type ClauseStatus = 'present' | 'missing' | 'ambiguous';

export type Confidence = 'low' | 'medium' | 'high';

export type Evidence = {
  quote: string;
  clauseHeading?: string;
};

export type ContractClassification = {
  reason: string;
  confidence: Confidence;
  evidence: Evidence[];
};

export type ClauseCheck = {
  ruleId: string;
  clauseName: string;
  status: ClauseStatus;
  riskLevel: Severity;
  reason: string;
  evidence: Evidence[];
  recommendation: string;
};

export type RiskFlag = {
  ruleId: string;
  title: string;
  severity: Severity;
  explanation: string;
  evidence: Evidence[];
  reference: {
    source: 'Uploaded contract' | 'Internal legal risk checklist';
    rationale: string;
  };
  recommendation: string;
};

export type ContractAIResult = {
  type: ContractType;
  riskScore: number;
  missingClauses: string[];
  recommendations: string[];
  classification: ContractClassification;
  clauseChecks: ClauseCheck[];
  riskFlags: RiskFlag[];
  confidence: Confidence;
  limitations: string[];
};

export type JudgeReviewIssue = {
  severity?: Severity;
  title?: string;
  message?: string;
  explanation?: string;
  recommendation?: string;
  path?: string;
  [key: string]: unknown;
};

export type JudgeReview = {
  qualityScore: number;
  status: string;
  summary?: string;
  issues: JudgeReviewIssue[];
  passed?: boolean;
  score?: number;
  [key: string]: unknown;
};

export type ContractAnalysis = ContractAIResult & {
  id: string;
  filename: string;
  createdAt: string;
  fromCache?: boolean;
  cachedFromAnalysisId?: string;
  documentHash?: string;
  cacheKey?: string;
  analysisVersion?: string;
  promptVersion?: string;
  modelName?: string;
  aiProvider?: string;
  qualityReview?: JudgeReview;
};

export type ContractAnalysisSummary = {
  id: string;
  filename: string;
  createdAt: string;
  type: ContractType;
  riskScore: number;
  fromCache?: boolean;
  cachedFromAnalysisId?: string;
  documentHash?: string;
  modelName?: string;
  analysisVersion?: string;
  promptVersion?: string;
  aiProvider?: string;
};