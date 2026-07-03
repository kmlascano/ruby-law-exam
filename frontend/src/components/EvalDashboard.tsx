import { useEffect, useState, type ReactElement } from 'react';

type EvalCase = {
  id: string;
  file: string;
  expectedType?: string;
  expectedBand?: string;
  scoreMin?: number;
  scoreMax?: number;
  notes?: string;
};

type EvalRunCase = {
  id: string;
  file: string;
  passed: boolean;
  failures?: string[];
  actual?: {
    type?: string;
    score?: number;
    band?: string;
  };
};

type EvalRun = {
  filename: string;
  createdAt: string;
  passed: number;
  failed: number;
  total: number;
  durationMs?: number;
  results?: EvalRunCase[];
};

type EvalResponse = {
  data: {
    cases: EvalCase[];
    results: EvalRun[];
    latest: EvalRun | null;
  };
};

const ruby = '#9f2d63';
const rubyDark = '#5f1638';
const muted = '#667085';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDuration(ms?: number): string {
  if (!ms) return '—';

  const seconds = Math.round(ms / 1000);

  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `${minutes}m ${rest}s`;
}

function getPassRate(run: EvalRun | null): number {
  if (!run || run.total === 0) return 0;
  return Math.round((run.passed / run.total) * 100);
}

export function EvalDashboard(): ReactElement {
  const [data, setData] = useState<EvalResponse['data'] | null>(null);
  const [selectedRunIndex, setSelectedRunIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadData(): Promise<void> {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/evals');
      const payload = (await response.json()) as EvalResponse;

      if (!response.ok) {
        throw new Error('Could not load eval data.');
      }

      setData(payload.data);
      setSelectedRunIndex(0);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not load eval data.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const latest = data?.latest ?? null;
  const selectedRun = data?.results[selectedRunIndex] ?? null;

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ead3dd',
        borderRadius: 28,
        padding: '1.5rem',
        boxShadow: '0 24px 70px rgba(95, 22, 56, 0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          alignItems: 'flex-start',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: rubyDark }}>Eval Dashboard</h2>
          <p style={{ margin: '0.4rem 0 0', color: muted }}>
            See previous regression runs and the upcoming eval cases.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={isLoading}
          style={{
            border: 0,
            borderRadius: 999,
            padding: '0.75rem 1rem',
            background: ruby,
            color: '#fff',
            fontWeight: 800,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            padding: '1rem',
            borderRadius: 16,
            background: '#fff1f2',
            color: '#9f1239',
            border: '1px solid #fecdd3',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      ) : null}

      {isLoading ? <p style={{ color: muted }}>Loading eval history...</p> : null}

      {!isLoading && data ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            <Metric label="Latest pass rate" value={`${getPassRate(latest)}%`} />
            <Metric label="Passed" value={String(latest?.passed ?? 0)} />
            <Metric label="Failed" value={String(latest?.failed ?? 0)} />
            <Metric label="Total cases" value={String(latest?.total ?? data.cases.length)} />
            <Metric label="Duration" value={formatDuration(latest?.durationMs)} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(260px, 0.8fr) minmax(0, 1.2fr)',
              gap: '1rem',
              alignItems: 'start',
            }}
          >
            <section>
              <h3 style={{ color: rubyDark, marginTop: 0 }}>Past eval runs</h3>

              <div style={{ display: 'grid', gap: '0.65rem' }}>
                {data.results.length === 0 ? (
                  <p style={{ color: muted }}>No eval runs found yet.</p>
                ) : (
                  data.results.map((run, index) => (
                    <button
                      key={run.filename}
                      type="button"
                      onClick={() => setSelectedRunIndex(index)}
                      style={{
                        textAlign: 'left',
                        border: '1px solid #ead3dd',
                        borderRadius: 16,
                        padding: '0.9rem',
                        background: selectedRunIndex === index ? '#fbf3f7' : '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <strong style={{ color: rubyDark }}>
                        {run.passed}/{run.total} passed
                      </strong>

                      <div
                        style={{
                          color: run.failed > 0 ? '#be123c' : '#027a48',
                          fontWeight: 800,
                          marginTop: '0.25rem',
                        }}
                      >
                        {run.failed > 0 ? `${run.failed} failed` : 'clean'}
                      </div>

                      <div style={{ color: muted, fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        {formatDate(run.createdAt)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section>
              <h3 style={{ color: rubyDark, marginTop: 0 }}>Selected run</h3>

              {!selectedRun ? (
                <p style={{ color: muted }}>No run selected.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.65rem' }}>
                  {(selectedRun.results ?? []).map((result) => (
                    <div
                      key={result.id}
                      style={{
                        border: '1px solid #ead3dd',
                        borderRadius: 16,
                        padding: '0.9rem',
                        background: '#fff',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '1rem',
                        }}
                      >
                        <strong>{result.id}</strong>

                        <span
                          style={{
                            borderRadius: 999,
                            padding: '0.25rem 0.55rem',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            background: result.passed ? '#ecfdf3' : '#fff1f2',
                            color: result.passed ? '#027a48' : '#be123c',
                          }}
                        >
                          {result.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>

                      <div style={{ color: muted, fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        {result.file}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: '1rem',
                          flexWrap: 'wrap',
                          marginTop: '0.65rem',
                          color: muted,
                        }}
                      >
                        <span>Type: {result.actual?.type ?? '—'}</span>
                        <span>Band: {result.actual?.band ?? '—'}</span>
                        <span>Score: {result.actual?.score ?? '—'}</span>
                      </div>

                      {result.failures?.length ? (
                        <ul style={{ color: '#be123c', marginBottom: 0 }}>
                          {result.failures.map((failure) => (
                            <li key={failure}>{failure}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section style={{ marginTop: '1.25rem' }}>
            <h3 style={{ color: rubyDark }}>Upcoming eval cases</h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {data.cases.map((testCase) => (
                <div
                  key={testCase.id}
                  style={{
                    border: '1px solid #ead3dd',
                    borderRadius: 16,
                    padding: '0.9rem',
                    background: '#fffafc',
                  }}
                >
                  <strong style={{ color: rubyDark }}>{testCase.id}</strong>

                  <div style={{ color: muted, fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    {testCase.file}
                  </div>

                  <div style={{ marginTop: '0.5rem' }}>
                    Expected: <strong>{testCase.expectedType ?? '—'}</strong> /{' '}
                    <strong>{testCase.expectedBand ?? '—'}</strong>
                  </div>

                  <div style={{ color: muted, fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Score: {testCase.scoreMin ?? '—'}–{testCase.scoreMax ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div
      style={{
        border: '1px solid #ead3dd',
        borderRadius: 18,
        padding: '1rem',
        background: '#fffafc',
      }}
    >
      <div style={{ color: muted, fontSize: '0.85rem', fontWeight: 700 }}>{label}</div>
      <strong style={{ display: 'block', color: rubyDark, fontSize: '1.8rem', marginTop: '0.25rem' }}>
        {value}
      </strong>
    </div>
  );
}