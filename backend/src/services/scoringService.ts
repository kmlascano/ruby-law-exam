import type { ContractAIResult } from '../types';

type Severity = 'low' | 'medium' | 'high';
type ClauseStatus = 'present' | 'missing' | 'ambiguous';
type RiskBand = 'low' | 'medium' | 'high';

type ClauseCheck = ContractAIResult['clauseChecks'][number];
type RiskFlag = ContractAIResult['riskFlags'][number];

const STATUS_MULTIPLIER: Record<ClauseStatus, number> = {
  present: 0,
  ambiguous: 0.45,
  missing: 1,
};

const CLAUSE_SEVERITY_POINTS: Record<Severity, number> = {
  low: 3,
  medium: 8,
  high: 14,
};

const FLAG_SEVERITY_POINTS: Record<Severity, number> = {
  low: 5,
  medium: 13,
  high: 30,
};

const OTHER_CONTRACT_TYPE_PENALTY = 5;

const MEDIUM_RISK_THRESHOLD = 30;
const HIGH_RISK_THRESHOLD = 65;

const MAX_SCORE_FOR_NO_ISSUES = 8;
const MAX_FINAL_SCORE = 96;

/*
  If the only problems are missing/ambiguous checklist items, the result should
  normally be medium, not automatically high.

  High should be reserved for:
  - actual risky wording found in the contract, or
  - critical foundation failure, or
  - truly extreme clause absence.
*/
const CLAUSE_ONLY_MEDIUM_CAP = 58;

const CRITICAL_FOUNDATION_RULE_IDS = new Set([
  'COMMON-PARTIES-001',
  'COMMON-CONSIDERATION-001',
  'COMMON-OBLIGATIONS-001',
]);

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normaliseText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function baseRuleId(ruleId: string): string {
  return ruleId.replace(/-(missing|ambiguous)$/i, '');
}

function severityRank(severity: Severity): number {
  return CLAUSE_SEVERITY_POINTS[severity];
}

function statusRank(status: ClauseStatus): number {
  if (status === 'missing') return 3;
  if (status === 'ambiguous') return 2;
  return 1;
}

function isNotApplicableText(value: string): boolean {
  const text = normaliseText(value);

  return (
    text === 'n/a' ||
    text === 'na' ||
    text === 'not applicable' ||
    text.includes('not applicable') ||
    text.includes('not a lease') ||
    text.includes('not a service agreement') ||
    text.includes('not an employment agreement') ||
    text.includes('not an nda')
  );
}

function isNotApplicableClause(check: ClauseCheck): boolean {
  return (
    check.riskLevel === 'low' &&
    (isNotApplicableText(check.reason) || isNotApplicableText(check.recommendation))
  );
}

function hasAnyIssue(analysis: ContractAIResult): boolean {
  return (
    analysis.clauseChecks.some(
      (check) => check.status !== 'present' && !isNotApplicableClause(check)
    ) ||
    analysis.riskFlags.length > 0 ||
    analysis.type === 'Other'
  );
}

function ruleWeight(ruleId: string): number {
  const id = baseRuleId(ruleId);

  /*
    Common foundation rules are useful quality signals, but they should not
    overwhelm type-specific legal/commercial risk.
  */
  if (id.startsWith('COMMON-')) {
    if (CRITICAL_FOUNDATION_RULE_IDS.has(id)) {
      return 0.8;
    }

    return 0.55;
  }

  return 1;
}

function scoreClauseCheck(check: ClauseCheck): number {
  if (isNotApplicableClause(check)) {
    return 0;
  }

  return (
    CLAUSE_SEVERITY_POINTS[check.riskLevel] *
    STATUS_MULTIPLIER[check.status] *
    ruleWeight(check.ruleId)
  );
}

function maxClauseScore(check: ClauseCheck): number {
  if (isNotApplicableClause(check)) {
    return 0;
  }

  return CLAUSE_SEVERITY_POINTS[check.riskLevel] * ruleWeight(check.ruleId);
}

function buildClauseStatusByRuleId(
  clauseChecks: ContractAIResult['clauseChecks']
): Map<string, ClauseStatus> {
  const map = new Map<string, ClauseStatus>();

  clauseChecks.forEach((check) => {
    map.set(check.ruleId, check.status);
    map.set(baseRuleId(check.ruleId), check.status);
  });

  return map;
}

function inferImpactArea(value: string): string {
  const text = normaliseText(value);

  if (text.includes('termination') || text.includes('notice') || text.includes('end ')) {
    return 'termination';
  }

  if (text.includes('liab') || text.includes('damage') || text.includes('cap')) {
    return 'liability';
  }

  if (text.includes('indemn')) {
    return 'indemnity';
  }

  if (
    text.includes('privacy') ||
    text.includes('data') ||
    text.includes('personal') ||
    text.includes('security') ||
    text.includes('breach notification')
  ) {
    return 'data';
  }

  if (text.includes('insurance')) {
    return 'insurance';
  }

  if (
    text.includes('intellectual') ||
    text.includes(' ip ') ||
    text.includes('ownership') ||
    text.includes('invention') ||
    text.includes('work product')
  ) {
    return 'ip';
  }

  if (
    text.includes('payment') ||
    text.includes('fee') ||
    text.includes('invoice') ||
    text.includes('salary') ||
    text.includes('compensation') ||
    text.includes('price') ||
    text.includes('rent')
  ) {
    return 'payment';
  }

  if (
    text.includes('breach') ||
    text.includes('remed') ||
    text.includes('default') ||
    text.includes('cure')
  ) {
    return 'remedies';
  }

  if (
    text.includes('dispute') ||
    text.includes('governing') ||
    text.includes('jurisdiction') ||
    text.includes('law')
  ) {
    return 'enforceability';
  }

  if (
    text.includes('scope') ||
    text.includes('service') ||
    text.includes('deliverable') ||
    text.includes('obligation') ||
    text.includes('duties') ||
    text.includes('role')
  ) {
    return 'obligations';
  }

  if (text.includes('confidential')) {
    return 'confidentiality';
  }

  return baseRuleId(value);
}

function getScoredRiskFlags(
  flags: ContractAIResult['riskFlags'],
  clauseStatusByRuleId: Map<string, ClauseStatus>
): RiskFlag[] {
  const seen = new Set<string>();
  const scoredFlags: RiskFlag[] = [];

  flags.forEach((flag) => {
    const linkedClauseStatus =
      clauseStatusByRuleId.get(flag.ruleId) ?? clauseStatusByRuleId.get(baseRuleId(flag.ruleId));

    /*
      Missing/ambiguous checklist items already score via clauseChecks.
      We only score riskFlags when they represent present-but-risky wording
      or a separate evidenced issue.
    */
    if (linkedClauseStatus && linkedClauseStatus !== 'present') {
      return;
    }

    /*
      Empty-evidence flags usually mean "this clause is missing".
      That belongs in clauseChecks, not in riskFlags scoring.
    */
    if (flag.evidence.length === 0 && flag.reference.source === 'Uploaded contract') {
      return;
    }

    const key = `${baseRuleId(flag.ruleId)}:${normaliseText(flag.title)}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    scoredFlags.push(flag);
  });

  return scoredFlags;
}

function scoreClauseChecks(clauseChecks: ContractAIResult['clauseChecks']): number {
  const relevantChecks = clauseChecks.filter((check) => !isNotApplicableClause(check));

  if (relevantChecks.length === 0) {
    return 0;
  }

  const actualByArea = new Map<string, number>();
  const maximumByArea = new Map<string, number>();

  relevantChecks.forEach((check) => {
    const area = inferImpactArea(`${check.ruleId} ${check.clauseName}`);
    const actual = scoreClauseCheck(check);
    const maximum = maxClauseScore(check);

    actualByArea.set(area, Math.max(actualByArea.get(area) ?? 0, actual));
    maximumByArea.set(area, Math.max(maximumByArea.get(area) ?? 0, maximum));
  });

  const actual = Array.from(actualByArea.values()).reduce((total, value) => total + value, 0);
  const maximum = Array.from(maximumByArea.values()).reduce((total, value) => total + value, 0);

  if (maximum <= 0) {
    return 0;
  }

  const issueRatio = actual / maximum;

  return issueRatio * 44;
}

function scoreRiskFlags(flags: RiskFlag[]): number {
  const rawFlagScore = flags.reduce((total, flag) => {
    return total + FLAG_SEVERITY_POINTS[flag.severity];
  }, 0);

  return 42 * (rawFlagScore / (rawFlagScore + 36));
}

function countClauseIssues(
  clauseChecks: ContractAIResult['clauseChecks'],
  status: ClauseStatus,
  severity: Severity
): number {
  return clauseChecks.filter(
    (check) =>
      !isNotApplicableClause(check) &&
      check.status === status &&
      check.riskLevel === severity
  ).length;
}

function countFlagIssues(flags: RiskFlag[], severity: Severity): number {
  return flags.filter((flag) => flag.severity === severity).length;
}

function hasCriticalFoundationFailure(analysis: ContractAIResult): boolean {
  return analysis.clauseChecks.some((check) => {
    return (
      CRITICAL_FOUNDATION_RULE_IDS.has(baseRuleId(check.ruleId)) &&
      (check.status === 'missing' || check.status === 'ambiguous') &&
      check.riskLevel === 'high'
    );
  });
}

function scoreCriticalIssuePressure(
  analysis: ContractAIResult,
  scoredRiskFlags: RiskFlag[]
): number {
  const missingHighCount = countClauseIssues(analysis.clauseChecks, 'missing', 'high');
  const ambiguousHighCount = countClauseIssues(analysis.clauseChecks, 'ambiguous', 'high');

  const missingMediumCount = countClauseIssues(analysis.clauseChecks, 'missing', 'medium');
  const ambiguousMediumCount = countClauseIssues(analysis.clauseChecks, 'ambiguous', 'medium');

  const highFlagCount = countFlagIssues(scoredRiskFlags, 'high');
  const mediumFlagCount = countFlagIssues(scoredRiskFlags, 'medium');

  /*
    Present-but-risky flags matter more than missing standard checklist clauses.
  */
  const highPressure =
    missingHighCount * 3.5 +
    ambiguousHighCount * 2.5 +
    highFlagCount * 11;

  const mediumPressure =
    missingMediumCount * 2 +
    ambiguousMediumCount * 1.5 +
    mediumFlagCount * 4;

  return Math.min(18, highPressure + mediumPressure);
}

function scoreRiskBreadth(
  analysis: ContractAIResult,
  scoredRiskFlags: RiskFlag[]
): number {
  const issueAreas = new Set<string>();

  analysis.clauseChecks
    .filter((check) => check.status !== 'present' && !isNotApplicableClause(check))
    .forEach((check) => {
      issueAreas.add(inferImpactArea(`${check.ruleId} ${check.clauseName}`));
    });

  scoredRiskFlags.forEach((flag) => {
    issueAreas.add(inferImpactArea(`${flag.ruleId} ${flag.title} ${flag.explanation}`));
  });

  const issueCount =
    analysis.clauseChecks.filter(
      (check) => check.status !== 'present' && !isNotApplicableClause(check)
    ).length + scoredRiskFlags.length;

  const areaScore = Math.min(7, issueAreas.size * 1.5);
  const volumeScore = Math.min(5, issueCount * 0.9);

  return areaScore + volumeScore;
}

function scoreBandPressure(
  analysis: ContractAIResult,
  scoredRiskFlags: RiskFlag[]
): number {
  const missingHighCount = countClauseIssues(analysis.clauseChecks, 'missing', 'high');
  const ambiguousHighCount = countClauseIssues(analysis.clauseChecks, 'ambiguous', 'high');
  const missingMediumCount = countClauseIssues(analysis.clauseChecks, 'missing', 'medium');
  const ambiguousMediumCount = countClauseIssues(analysis.clauseChecks, 'ambiguous', 'medium');

  const highFlagCount = countFlagIssues(scoredRiskFlags, 'high');
  const mediumFlagCount = countFlagIssues(scoredRiskFlags, 'medium');

  const highClauseSignals = missingHighCount + ambiguousHighCount;
  const mediumClauseSignals = missingMediumCount + ambiguousMediumCount;
  const highMaterialSignals = highFlagCount;
  const mediumMaterialSignals = mediumFlagCount;

  /*
    High band comes from material evidenced risk, not merely a pile of
    missing checklist items.
  */
  if (highMaterialSignals >= 1 && mediumClauseSignals + mediumMaterialSignals >= 1) {
    return 68;
  }

  if (highMaterialSignals >= 2) {
    return 70;
  }

  if (hasCriticalFoundationFailure(analysis) && highClauseSignals + mediumClauseSignals >= 2) {
    return 65;
  }

  /*
    Truly extreme absence can still reach high, but normal incomplete drafts
    should remain medium.
  */
  if (highClauseSignals >= 4 && mediumClauseSignals >= 3) {
    return 65;
  }

  if (highClauseSignals >= 2) {
    return 55;
  }

  if (highClauseSignals >= 1) {
    return 48;
  }

  if (mediumClauseSignals >= 4) {
    return 45;
  }

  if (mediumClauseSignals >= 2) {
    return 35;
  }

  return 0;
}

function buildMissingClauses(analysis: ContractAIResult): string[] {
  return uniqueStrings(
    analysis.clauseChecks
      .filter((check) => check.status === 'missing' && !isNotApplicableClause(check))
      .map((check) => check.clauseName)
  );
}

function buildRecommendations(analysis: ContractAIResult): string[] {
  const clauseRecommendations = [...analysis.clauseChecks]
    .filter((check) => check.status !== 'present' && !isNotApplicableClause(check))
    .sort((a, b) => {
      const severityDiff = severityRank(b.riskLevel) - severityRank(a.riskLevel);

      if (severityDiff !== 0) {
        return severityDiff;
      }

      return statusRank(b.status) - statusRank(a.status);
    })
    .map((check) => check.recommendation);

  const flagRecommendations = [...analysis.riskFlags]
    .filter((flag) => !isNotApplicableText(flag.recommendation))
    .sort((a, b) => FLAG_SEVERITY_POINTS[b.severity] - FLAG_SEVERITY_POINTS[a.severity])
    .map((flag) => flag.recommendation);

  return uniqueStrings([
    ...clauseRecommendations,
    ...flagRecommendations,
    ...analysis.recommendations.filter((item) => !isNotApplicableText(item)),
  ]).slice(0, 10);
}

function riskBand(score: number): RiskBand {
  if (score >= HIGH_RISK_THRESHOLD) return 'high';
  if (score >= MEDIUM_RISK_THRESHOLD) return 'medium';
  return 'low';
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(MAX_FINAL_SCORE, Math.round(score)));
}

export function normaliseAndScoreAnalysis(analysis: ContractAIResult): ContractAIResult {
  const clauseStatusByRuleId = buildClauseStatusByRuleId(analysis.clauseChecks);
  const scoredRiskFlags = getScoredRiskFlags(analysis.riskFlags, clauseStatusByRuleId);

  const clauseScore = scoreClauseChecks(analysis.clauseChecks);
  const flagScore = scoreRiskFlags(scoredRiskFlags);
  const criticalIssuePressure = scoreCriticalIssuePressure(analysis, scoredRiskFlags);
  const breadthScore = scoreRiskBreadth(analysis, scoredRiskFlags);
  const bandPressureScore = scoreBandPressure(analysis, scoredRiskFlags);

  const otherPenalty = analysis.type === 'Other' ? OTHER_CONTRACT_TYPE_PENALTY : 0;

  const additiveScore =
    clauseScore +
    flagScore +
    criticalIssuePressure +
    breadthScore +
    otherPenalty;

  let finalScore = clampScore(Math.max(additiveScore, bandPressureScore));

  const hasScoredHighMaterialFlag = scoredRiskFlags.some((flag) => flag.severity === 'high');

  /*
    This is the important calibration:
    incomplete checklist coverage alone should normally top out at medium.
    Present-but-dangerous wording can still reach high.
  */
  if (!hasScoredHighMaterialFlag && !hasCriticalFoundationFailure(analysis)) {
    finalScore = Math.min(finalScore, CLAUSE_ONLY_MEDIUM_CAP);
  }

  if (!hasAnyIssue(analysis)) {
    finalScore = Math.min(finalScore, MAX_SCORE_FOR_NO_ISSUES);
  }

  return {
    ...analysis,
    riskScore: finalScore,
    missingClauses: buildMissingClauses(analysis),
    recommendations: buildRecommendations(analysis),
    limitations: uniqueStrings([
      ...analysis.limitations,
      `Calibrated risk band: ${riskBand(finalScore)}.`,
      'The final score is calculated by a deterministic backend rubric after AI analysis.',
      'Model confidence is reported separately from the deterministic risk score.',
    ]),
  };
}