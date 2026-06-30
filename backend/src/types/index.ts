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
