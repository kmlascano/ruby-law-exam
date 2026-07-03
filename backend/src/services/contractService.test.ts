import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callAI } from './aiService';
import { analyseContract } from './contractService';
import { contractStore } from './contractStore';
import { extractText } from './extractorService';
import { judgeAnalysis } from './judgeService';
import type { ContractAIResult } from '../types';

vi.mock('./extractorService', () => ({
  extractText: vi.fn(),
}));

vi.mock('./aiService', () => ({
  callAI: vi.fn(),
}));

vi.mock('./judgeService', () => ({
  judgeAnalysis: vi.fn(),
}));

const mockExtractText = vi.mocked(extractText);
const mockCallAI = vi.mocked(callAI);
const mockJudgeAnalysis = vi.mocked(judgeAnalysis);

const aiResult: ContractAIResult = {
  type: 'Service Agreement',
  riskScore: 72,
  missingClauses: ['Indemnity'],
  recommendations: ['Ask legal counsel to review indemnity and liability wording before signing.'],
  classification: {
    reason: 'The contract describes services, fees, and deliverables.',
    confidence: 'high',
    evidence: [{ quote: 'Provider shall perform the services set out in Schedule 1.' }],
  },
  clauseChecks: [
    {
      ruleId: 'SERV-LIAB-001',
      clauseName: 'Limitation of liability',
      status: 'ambiguous',
      riskLevel: 'high',
      reason: 'The liability cap exists but carve-outs are unclear.',
      evidence: [{ quote: 'Liability shall not exceed fees paid.' }],
      recommendation: 'Clarify liability cap carve-outs and excluded losses.',
    },
  ],
  riskFlags: [
    {
      ruleId: 'SERV-LIAB-001',
      title: 'Ambiguous limitation of liability',
      severity: 'high',
      explanation: 'The liability cap does not clearly address carve-outs.',
      evidence: [{ quote: 'Liability shall not exceed fees paid.' }],
      reference: {
        source: 'Uploaded contract',
        rationale: 'The uploaded clause limits liability but leaves carve-outs unclear.',
      },
      recommendation: 'Clarify the limitation of liability before signing.',
    },
  ],
  confidence: 'high',
  limitations: ['AI-assisted triage only; not legal advice.'],
};

describe('contractService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contractStore.clear();
    delete process.env.ENABLE_LLM_JUDGE;
  });

  it('returns and stores a valid ContractAnalysis when upload succeeds', async () => {
    mockExtractText.mockResolvedValue('Service agreement text');
    mockCallAI.mockResolvedValue(aiResult);

    const result = await analyseContract(
      Buffer.from('fake file'),
      'application/pdf',
      'service-agreement.pdf'
    );

    expect(result.id).toHaveLength(36);
    expect(result.filename).toBe('service-agreement.pdf');
    expect(result.type).toBe('Service Agreement');
    expect(result.riskFlags[0]?.evidence[0]?.quote).toContain('Liability');
    expect(contractStore.get(result.id)).toEqual(result);
    expect(mockJudgeAnalysis).not.toHaveBeenCalled();
  });

  it('propagates AI service failures without storing a partial result', async () => {
    mockExtractText.mockResolvedValue('Service agreement text');
    mockCallAI.mockRejectedValue(new Error('AI unavailable'));

    await expect(
      analyseContract(Buffer.from('fake file'), 'application/pdf', 'service-agreement.pdf')
    ).rejects.toThrow('AI unavailable');

    expect(contractStore.size).toBe(0);
  });

  it('runs the optional LLM judge when enabled', async () => {
    process.env.ENABLE_LLM_JUDGE = 'true';
    mockExtractText.mockResolvedValue('Service agreement text');
    mockCallAI.mockResolvedValue(aiResult);
    mockJudgeAnalysis.mockResolvedValue({
      status: 'warn',
      qualityScore: 82,
      requiresHumanReview: true,
      issues: [
        {
          severity: 'medium',
          field: 'riskFlags[0].severity',
          message: 'High risk is plausible, but should be reviewed by counsel.',
        },
      ],
    });

    const result = await analyseContract(
      Buffer.from('fake file'),
      'application/pdf',
      'service-agreement.pdf'
    );

    expect(result.qualityReview?.status).toBe('warn');
    expect(mockJudgeAnalysis).toHaveBeenCalledOnce();
  });
});
