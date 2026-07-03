import { z } from 'zod';

export const ContractTypeSchema = z.enum([
  'NDA',
  'Employment',
  'Service Agreement',
  'Lease',
  'Other',
]);

export const SeveritySchema = z.enum(['low', 'medium', 'high']);
export const ConfidenceSchema = z.enum(['low', 'medium', 'high']);
export const ClauseStatusSchema = z.enum(['present', 'missing', 'ambiguous']);

export const EvidenceSchema = z.object({
  quote: z.string().min(1),
  clauseHeading: z.string().optional(),
  page: z.number().int().positive().optional(),
  startChar: z.number().int().nonnegative().optional(),
  endChar: z.number().int().nonnegative().optional(),
});

export const ClassificationSchema = z.object({
  reason: z.string().min(1),
  confidence: ConfidenceSchema,
  evidence: z.array(EvidenceSchema),
});

export const ClauseCheckSchema = z.object({
  ruleId: z.string().min(1),
  clauseName: z.string().min(1),
  status: ClauseStatusSchema,
  riskLevel: SeveritySchema,
  reason: z.string().min(1),
  evidence: z.array(EvidenceSchema),
  recommendation: z.string().min(1),
});

const ReferenceSourceSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalised = value.toLowerCase().trim();

  if (
    normalised.includes('checklist') ||
    normalised.includes('internal') ||
    normalised.includes('legal risk')
  ) {
    return 'Internal legal risk checklist';
  }

  if (
    normalised.includes('uploaded') ||
    normalised.includes('contract') ||
    normalised.includes('document')
  ) {
    return 'Uploaded contract';
  }

  return value;
}, z.enum(['Uploaded contract', 'Internal legal risk checklist']));

export const RiskFlagSchema = z.object({
  ruleId: z.string().min(1),
  title: z.string().min(1),
  severity: SeveritySchema,
  explanation: z.string().min(1),
  evidence: z.array(EvidenceSchema),
  reference: z.object({
    source: ReferenceSourceSchema,
    rationale: z.string().min(1),
  }),
  recommendation: z.string().min(1),
});

export const JudgeReviewSchema = z.object({
  status: z.enum(['pass', 'warn', 'fail']),
  qualityScore: z.number().int().min(0).max(100),
  requiresHumanReview: z.boolean(),
  issues: z.array(
    z.object({
      severity: SeveritySchema,
      field: z.string().min(1),
      message: z.string().min(1),
    })
  ),
});

export const ContractAIResultSchema = z.object({
  type: ContractTypeSchema,
  riskScore: z.number().int().min(0).max(100),
  missingClauses: z.array(z.string()),
  recommendations: z.array(z.string()),
  classification: ClassificationSchema,
  clauseChecks: z.array(ClauseCheckSchema),
  riskFlags: z.array(RiskFlagSchema),
  confidence: ConfidenceSchema,
  limitations: z.array(z.string()),
});

export type ContractType = z.infer<typeof ContractTypeSchema>;
export type ContractAIResult = z.infer<typeof ContractAIResultSchema>;
export type JudgeReview = z.infer<typeof JudgeReviewSchema>;
