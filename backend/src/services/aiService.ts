import OpenAI from 'openai';
import { z } from 'zod';
import type { ContractAIResult } from '../types';

// TODO: implement the AI call
// - Call OpenAI (or Azure OpenAI) with the extracted contract text
// - Ask the model to return structured JSON: type, riskScore, missingClauses, recommendations
// - Validate the response with Zod before returning
// - Handle API errors gracefully (throw a meaningful error)

const AIResultSchema = z.object({
  type: z.string(),
  riskScore: z.number().min(0).max(100),
  missingClauses: z.array(z.string()),
  recommendations: z.array(z.string()),
});

// Stub — replace with real implementation
export async function callAI(_text: string): Promise<ContractAIResult> {
  // Hint: initialise the OpenAI client with process.env.OPENAI_API_KEY
  // Hint: use a system prompt that explains the task and requests JSON output
  throw new Error('AI service not implemented yet');
}
