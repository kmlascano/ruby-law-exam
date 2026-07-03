import type { ReactElement } from 'react';
import type { ClauseCheck, ContractAnalysis, Evidence, RiskFlag, Severity } from '../types';

type AnalysisResultsProps = {
  result: ContractAnalysis;
};

function riskColour(score: number): string {
  if (score < 40) return '#166534';
  if (score < 70) return '#92400e';
  return '#991b1b';
}

function qualityColour(score: number): string {
  if (score >= 85) return '#166534';
  if (score >= 70) return '#92400e';
  return '#991b1b';
}

function qualityLabel(score: number): string {
  if (score >= 85) return 'Strong analysis';
  if (score >= 70) return 'Usable with caution';
  return 'Needs review';
}

function severityLabel(severity: Severity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

function formatDate(value: string | undefined): string {
  if (!value) return 'Unknown';

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
}

function shortHash(value: string | undefined): string {
  if (!value) return 'Not available';
  return value.length > 14 ? `${value.slice(0, 14)}…` : value;
}

function EvidenceList({ evidence }: { evidence: Evidence[] }): ReactElement {
  if (evidence.length === 0) {
    return <p style={{ margin: '0.5rem 0', color: '#64748b' }}>No direct quote found. Treated as missing or ambiguous.</p>;
  }

  return (
    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem' }}>
      {evidence.map((item, index) => (
        <li key={`${item.quote}-${index}`} style={{ marginBottom: '0.4rem' }}>
          <q>{item.quote}</q>
          {item.clauseHeading ? <span> — {item.clauseHeading}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function RiskFlagCard({ flag }: { flag: RiskFlag }): ReactElement {
  return (
    <article style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '1rem', marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{flag.title}</h3>
        <span style={{ fontWeight: 700, color: riskColour(flag.severity === 'high' ? 80 : flag.severity === 'medium' ? 55 : 25) }}>
          {severityLabel(flag.severity)}
        </span>
      </div>
      <p>{flag.explanation}</p>
      <strong>Evidence</strong>
      <EvidenceList evidence={flag.evidence} />
      <p style={{ color: '#475569' }}>
        <strong>Why this rule exists:</strong> {flag.reference.rationale}
      </p>
      <p>
        <strong>Recommendation:</strong> {flag.recommendation}
      </p>
    </article>
  );
}

function ClauseCheckRow({ check }: { check: ClauseCheck }): ReactElement {
  return (
    <tr>
      <td>{check.clauseName}</td>
      <td>{check.status}</td>
      <td>{severityLabel(check.riskLevel)}</td>
      <td>{check.reason}</td>
    </tr>
  );
}

function ResultMetadata({ result }: { result: ContractAnalysis }): ReactElement {
  const cacheLabel = result.fromCache ? 'Loaded from saved analysis' : 'New AI analysis saved';
  const cacheDescription = result.fromCache
    ? 'This upload matched an existing cache key, so the backend returned a stored outcome instead of spending on a new AI call.'
    : 'This outcome was generated once, saved to history, and indexed for future cache hits.';

  return (
    <section
      style={{
        marginTop: '1rem',
        border: '1px solid #ead3dd',
        borderRadius: 16,
        padding: '1rem',
        background: '#fffafd',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, color: '#9f2d63', fontWeight: 800 }}>{cacheLabel}</p>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b', lineHeight: 1.6 }}>{cacheDescription}</p>
        </div>

        <span
          style={{
            alignSelf: 'flex-start',
            borderRadius: 999,
            padding: '0.4rem 0.7rem',
            background: result.fromCache ? '#ecfdf5' : '#eff6ff',
            color: result.fromCache ? '#166534' : '#1d4ed8',
            fontWeight: 800,
            whiteSpace: 'nowrap',
          }}
        >
          {result.fromCache ? 'Cache hit' : 'Cache miss'}
        </span>
      </div>

      <dl
        style={{
          margin: '1rem 0 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.8rem',
        }}
      >
        {[
          ['Saved at', formatDate(result.createdAt)],
          ['Analysis ID', shortHash(result.id)],
          ['Document hash', shortHash(result.documentHash)],
          ['Model', result.modelName ?? 'Not available'],
          ['Prompt version', result.promptVersion ?? 'Not available'],
          ['Analysis version', result.analysisVersion ?? 'Not available'],
          [
            'Quality score',
            result.qualityReview ? `${result.qualityReview.qualityScore} / 100` : 'Not judged',
          ],
          [
            'Quality status',
            result.qualityReview ? qualityLabel(result.qualityReview.qualityScore) : 'Not judged',
          ],
        ].map(([label, value]) => (
          <div key={label} style={{ padding: '0.8rem', borderRadius: 12, background: '#ffffff', border: '1px solid #f0d6e1' }}>
            <dt style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '0.25rem' }}>{label}</dt>
            <dd style={{ margin: 0, color: '#1f2933', fontWeight: 700, overflowWrap: 'anywhere' }}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function AnalysisResults({ result }: AnalysisResultsProps): ReactElement {
  const riskScoreColour = riskColour(result.riskScore);

  return (
    <section style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, color: '#64748b' }}>Analysis result</p>
          <h2 style={{ marginTop: '0.25rem' }}>{result.filename}</h2>
        </div>
        <span style={{ background: '#e0f2fe', color: '#075985', borderRadius: 999, padding: '0.5rem 0.75rem', fontWeight: 700 }}>
          {result.type}
        </span>
      </div>

      <ResultMetadata result={result} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginTop: '1rem',
        }}
      >
        <div style={{ border: `2px solid ${riskScoreColour}`, borderRadius: 12, padding: '1rem' }}>
          <p style={{ margin: 0, color: '#64748b' }}>Risk score</p>
          <strong style={{ fontSize: '2.5rem', color: riskScoreColour }}>{result.riskScore}</strong>
          <span style={{ color: '#64748b' }}> / 100</span>
        </div>

        <div
          style={{
            border: `2px solid ${
              result.qualityReview ? qualityColour(result.qualityReview.qualityScore) : '#cbd5e1'
            }`,
            borderRadius: 12,
            padding: '1rem',
          }}
        >
          <p style={{ margin: 0, color: '#64748b' }}>Quality score</p>

          {result.qualityReview ? (
            <>
              <strong
                style={{
                  fontSize: '2.5rem',
                  color: qualityColour(result.qualityReview.qualityScore),
                }}
              >
                {result.qualityReview.qualityScore}
              </strong>
              <span style={{ color: '#64748b' }}> / 100</span>

              <p
                style={{
                  margin: '0.4rem 0 0',
                  color: qualityColour(result.qualityReview.qualityScore),
                  fontWeight: 800,
                }}
              >
                {qualityLabel(result.qualityReview.qualityScore)}
              </p>
            </>
          ) : (
            <strong style={{ fontSize: '1.4rem', color: '#64748b' }}>Not judged</strong>
          )}
        </div>
      </div>

      <section style={{ marginTop: '1.5rem' }}>
        <h3>Classification decision</h3>
        <p>{result.classification.reason}</p>
        <p>
          <strong>Confidence:</strong> {result.classification.confidence}
        </p>
        <EvidenceList evidence={result.classification.evidence} />
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h3>Missing clauses</h3>
        {result.missingClauses.length > 0 ? (
          <ul>
            {result.missingClauses.map((clause) => (
              <li key={clause}>{clause}</li>
            ))}
          </ul>
        ) : (
          <p>No missing clauses detected.</p>
        )}
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h3>Recommendations</h3>
        <ul>
          {result.recommendations.map((recommendation) => (
            <li key={recommendation}>{recommendation}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h3>Evidence-backed risk flags</h3>
        {result.riskFlags.length > 0 ? (
          result.riskFlags.map((flag) => <RiskFlagCard key={`${flag.ruleId}-${flag.title}`} flag={flag} />)
        ) : (
          <p>No material risk flags detected.</p>
        )}
      </section>

      <section style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
        <h3>Clause checklist</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #cbd5e1', padding: '0.5rem' }}>Clause</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #cbd5e1', padding: '0.5rem' }}>Status</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #cbd5e1', padding: '0.5rem' }}>Risk</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #cbd5e1', padding: '0.5rem' }}>Reason</th>
            </tr>
          </thead>
          <tbody>{result.clauseChecks.map((check) => <ClauseCheckRow key={check.ruleId} check={check} />)}</tbody>
        </table>
      </section>

      {result.qualityReview ? (
        <section
          style={{
            marginTop: '1.5rem',
            border: '1px solid #ead3dd',
            borderRadius: 16,
            padding: '1rem',
            background: '#fffafd',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: '#9f2d63',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Analysis review
              </p>

              <h3 style={{ margin: '0.25rem 0 0' }}>Quality judgement for this result</h3>

              <p style={{ margin: '0.5rem 0 0', color: '#64748b', lineHeight: 1.6 }}>
                This judges how reliable, consistent, and evidence-backed the generated analysis is. It is separate from the contract risk
                score above.
              </p>
            </div>

            <span
              style={{
                borderRadius: 999,
                padding: '0.4rem 0.7rem',
                background: '#ffffff',
                border: '1px solid #ead3dd',
                color: '#5f1638',
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              Not contract risk
            </span>
          </div>

          <div
            style={{
              marginTop: '1rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Judgement score</p>

              <strong
                style={{
                  fontSize: '2rem',
                  color: qualityColour(result.qualityReview.qualityScore),
                }}
              >
                {result.qualityReview.qualityScore}
              </strong>

              <span style={{ color: '#64748b' }}> / 100</span>
            </div>

            <div>
              <p
                style={{
                  margin: 0,
                  color: qualityColour(result.qualityReview.qualityScore),
                  fontWeight: 800,
                }}
              >
                {qualityLabel(result.qualityReview.qualityScore)}
              </p>

              <p style={{ margin: '0.25rem 0 0', color: '#64748b' }}>Status: {result.qualityReview.status}</p>
            </div>
          </div>

          {result.qualityReview.requiresHumanReview ? (
            <p
              style={{
                margin: '1rem 0 0',
                padding: '0.75rem',
                borderRadius: 12,
                background: '#fef3c7',
                color: '#78350f',
                fontWeight: 700,
              }}
            >
              This result should be reviewed by a legal professional before it is relied on.
            </p>
          ) : null}

          {result.qualityReview.issues.length > 0 ? (
            <div style={{ marginTop: '1rem' }}>
              <strong>Why this judgement was given</strong>

              <ul style={{ marginBottom: 0 }}>
                {result.qualityReview.issues.map((issue) => (
                  <li key={`${issue.field}-${issue.message}`} style={{ marginTop: '0.4rem' }}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section style={{ marginTop: '1.5rem', color: '#475569' }}>
        <h3>Limitations</h3>
        <ul>
          {result.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}
