// Shared types used by both frontend and backend
// Keep in sync with backend/src/types/index.ts

export interface ContractAIResult {
  type: string;
  riskScore: number;
  missingClauses: string[];
  recommendations: string[];
}

export interface ContractAnalysis extends ContractAIResult {
  id: string;
  filename: string;
  createdAt: string;
}
