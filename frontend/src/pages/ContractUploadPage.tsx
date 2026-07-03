import { useState, type ReactElement } from 'react';
import { AnalysisHistory } from '../components/AnalysisHistory';
import { AnalysisResults } from '../components/AnalysisResults';
import { EvalDashboard } from '../components/EvalDashboard';
import { UploadForm } from '../components/UploadForm';
import type { ContractAnalysis } from '../types';

const ruby = '#9f2d63';
const rubyDark = '#5f1638';
const ink = '#1f2933';
const muted = '#667085';
const softPink = '#fbf3f7';

function ProcessingPanel(): ReactElement {
  return (
    <section
      role="status"
      aria-live="polite"
      style={{
        marginTop: '1.25rem',
        padding: '1.25rem',
        background: '#fff',
        border: '1px solid #ead3dd',
        borderRadius: 20,
        boxShadow: '0 18px 45px rgba(95, 22, 56, 0.08)',
      }}
    >
      <style>
        {`
          @keyframes rubySpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes rubyPulse {
            0%, 100% { opacity: 0.35; transform: translateY(0); }
            50% { opacity: 1; transform: translateY(-2px); }
          }

          .ruby-spinner {
            width: 34px;
            height: 34px;
            border: 3px solid #f2d6e2;
            border-top-color: ${ruby};
            border-radius: 999px;
            animation: rubySpin 0.9s linear infinite;
            flex: 0 0 auto;
          }

          .ruby-dot {
            width: 7px;
            height: 7px;
            border-radius: 999px;
            background: ${ruby};
            animation: rubyPulse 1.2s ease-in-out infinite;
          }

          .ruby-dot:nth-child(2) {
            animation-delay: 0.2s;
          }

          .ruby-dot:nth-child(3) {
            animation-delay: 0.4s;
          }
        `}
      </style>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div className="ruby-spinner" aria-hidden="true" />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, color: rubyDark, fontSize: '1.1rem' }}>Checking cache and reviewing your contract</h2>

            <div style={{ display: 'flex', gap: 5 }} aria-hidden="true">
              <span className="ruby-dot" />
              <span className="ruby-dot" />
              <span className="ruby-dot" />
            </div>
          </div>

          <p style={{ margin: '0.4rem 0 1rem', color: muted, lineHeight: 1.6 }}>
            Looking for a saved matching analysis first. If there is no cache hit, the backend will extract text, apply the legal checklist,
            and save the new outcome for future review.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {[
              'Hashing uploaded document',
              'Checking saved cache',
              'Running AI only on cache miss',
              'Saving reviewable outcome',
            ].map((label, index) => (
              <div
                key={label}
                style={{
                  padding: '0.85rem',
                  borderRadius: 14,
                  background: softPink,
                  border: '1px solid #f0d6e1',
                  color: ink,
                  fontSize: '0.95rem',
                }}
              >
                <strong style={{ color: ruby, marginRight: 8 }}>{index + 1}.</strong>
                {label}
              </div>
            ))}
          </div>

          <p style={{ margin: '1rem 0 0', color: muted, fontSize: '0.92rem' }}>
            Keep this page open. Results will appear automatically.
          </p>
        </div>
      </div>
    </section>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: 0,
        borderRadius: 999,
        padding: '0.75rem 1.1rem',
        background: isActive ? ruby : 'transparent',
        color: isActive ? '#fff' : rubyDark,
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: isActive ? '0 12px 24px rgba(159, 45, 99, 0.18)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

export function ContractUploadPage(): ReactElement {
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'evals'>('upload');
  const [result, setResult] = useState<ContractAnalysis | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function handleSuccess(nextResult: ContractAnalysis): void {
    setResult(nextResult);
    setError('');
  }

  function handleError(message: string): void {
    setError(message);
  }

  function handleLoadingChange(nextIsLoading: boolean): void {
    setIsLoading(nextIsLoading);

    if (nextIsLoading) {
      setResult(null);
    }
  }

  function handleSelectHistoryResult(nextResult: ContractAnalysis): void {
    setResult(nextResult);
    setError('');
    setIsLoading(false);
    setActiveTab('upload');
  }

  function handleHistoryDelete(deletedId: string): void {
    setResult((currentResult) => (currentResult?.id === deletedId ? null : currentResult));
  }

  function handleHistoryClear(): void {
    setResult(null);
    setError('');
    setIsLoading(false);
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(159, 45, 99, 0.12), transparent 34rem), linear-gradient(180deg, #fffafc 0%, #ffffff 42%)',
        color: ink,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <section
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '3rem 1.5rem 4rem',
        }}
      >
        <header
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.25fr) minmax(280px, 0.75fr)',
            gap: '2rem',
            alignItems: 'center',
            marginBottom: '2rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.65rem',
                marginBottom: '1.5rem',
                padding: '0.45rem 0.8rem',
                borderRadius: 999,
                background: '#fff',
                border: '1px solid #ead3dd',
                boxShadow: '0 10px 30px rgba(95, 22, 56, 0.06)',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: ruby,
                  display: 'inline-block',
                }}
              />
              <span style={{ color: rubyDark, fontWeight: 700, fontSize: '0.9rem' }}>
                Ruby-inspired legal AI technical exam
              </span>
            </div>

            <p
              style={{
                color: ruby,
                fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
                fontSize: 'clamp(1.7rem, 4vw, 3.2rem)',
                lineHeight: 1.05,
                margin: '0 0 0.8rem',
                letterSpacing: '-0.03em',
              }}
            >
              AI-native contract review, built for legal risk triage.
            </p>

            <h1
              style={{
                margin: 0,
                color: ink,
                fontSize: 'clamp(2.35rem, 6vw, 5rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.06em',
                maxWidth: 820,
              }}
            >
              Contract Upload & Analysis
            </h1>

            <p
              style={{
                margin: '1.25rem 0 0',
                color: muted,
                maxWidth: 720,
                fontSize: '1.15rem',
                lineHeight: 1.7,
              }}
            >
              Upload a contract to classify its type, identify missing clauses, and generate evidence-backed risk recommendations.
              Matching repeat uploads are served from saved outcomes instead of spending on a new AI call.
            </p>
          </div>

          <aside
            style={{
              background: ruby,
              color: '#fff',
              borderRadius: 28,
              padding: '2rem',
              minHeight: 280,
              boxShadow: '0 24px 70px rgba(159, 45, 99, 0.24)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
                fontSize: '3rem',
                letterSpacing: '-0.08em',
              }}
            >
              ruby
            </div>

            <div>
              <p style={{ margin: 0, opacity: 0.85, fontSize: '0.95rem' }}>Senior full-stack exam</p>
              <p style={{ margin: '0.45rem 0 0', fontSize: '1.45rem', lineHeight: 1.25, fontWeight: 700 }}>
                Clear workflow. Cached outcomes. Reviewable history.
              </p>
            </div>
          </aside>
        </header>

        <div
          style={{
            display: 'inline-flex',
            gap: '0.5rem',
            padding: '0.35rem',
            borderRadius: 999,
            background: '#fff',
            border: '1px solid #ead3dd',
            marginBottom: '1rem',
            boxShadow: '0 12px 35px rgba(95, 22, 56, 0.06)',
            flexWrap: 'wrap',
          }}
        >
          <TabButton label="Upload analysis" isActive={activeTab === 'upload'} onClick={() => setActiveTab('upload')} />
          <TabButton label="Saved analyses" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <TabButton label="Eval dashboard" isActive={activeTab === 'evals'} onClick={() => setActiveTab('evals')} />
        </div>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: '1rem',
          }}
        >
          {activeTab === 'upload' ? (
            <>
              <UploadForm onSuccess={handleSuccess} onError={handleError} onLoadingChange={handleLoadingChange} />

              {isLoading ? <ProcessingPanel /> : null}

              {error ? (
                <div
                  role="alert"
                  style={{
                    padding: '1rem 1.15rem',
                    background: '#fff1f2',
                    color: '#9f1239',
                    border: '1px solid #fecdd3',
                    borderRadius: 16,
                    boxShadow: '0 12px 35px rgba(159, 45, 99, 0.06)',
                  }}
                >
                  {error}
                </div>
              ) : null}

              {result ? <AnalysisResults result={result} /> : null}
            </>
          ) : null}

          {activeTab === 'history' ? (
            <AnalysisHistory
              onSelect={handleSelectHistoryResult}
              onDelete={handleHistoryDelete}
              onClearAll={handleHistoryClear}
            />
          ) : null}

          {activeTab === 'evals' ? <EvalDashboard /> : null}
        </section>
      </section>
    </main>
  );
}
