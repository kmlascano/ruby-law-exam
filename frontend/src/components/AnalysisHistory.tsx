import { useEffect, useState, type ReactElement } from 'react';
import type { ContractAnalysis, ContractAnalysisSummary } from '../types';

type AnalysisHistoryProps = {
  onSelect: (result: ContractAnalysis) => void;
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
};

type QualityReviewSummary = {
  qualityScore: number;
  status?: string;
  requiresHumanReview?: boolean;
};

type ContractAnalysisSummaryWithQuality = ContractAnalysisSummary & {
  qualityReview?: QualityReviewSummary | null;
  qualityScore?: number | null;
  qualityStatus?: string | null;
};

type HistoryResponse = {
  data: ContractAnalysisSummaryWithQuality[];
};

type DetailResponse = {
  data: ContractAnalysis;
};

const ruby = '#9f2d63';
const rubyDark = '#5f1638';
const muted = '#667085';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isQualityReviewSummary(value: unknown): value is QualityReviewSummary {
  return (
    isRecord(value) &&
    typeof value.qualityScore === 'number' &&
    (value.status === undefined || typeof value.status === 'string') &&
    (value.requiresHumanReview === undefined || typeof value.requiresHumanReview === 'boolean')
  );
}

function isSummary(value: unknown): value is ContractAnalysisSummaryWithQuality {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.filename !== 'string' ||
    typeof value.type !== 'string' ||
    typeof value.riskScore !== 'number' ||
    typeof value.createdAt !== 'string'
  ) {
    return false;
  }

  const qualityReviewIsValid =
    value.qualityReview === undefined ||
    value.qualityReview === null ||
    isQualityReviewSummary(value.qualityReview);

  const flatQualityScoreIsValid =
    value.qualityScore === undefined ||
    value.qualityScore === null ||
    typeof value.qualityScore === 'number';

  const flatQualityStatusIsValid =
    value.qualityStatus === undefined ||
    value.qualityStatus === null ||
    typeof value.qualityStatus === 'string';

  return qualityReviewIsValid && flatQualityScoreIsValid && flatQualityStatusIsValid;
}

function isHistoryResponse(value: unknown): value is HistoryResponse {
  return isRecord(value) && Array.isArray(value.data) && value.data.every(isSummary);
}

function isContractAnalysis(value: unknown): value is ContractAnalysis {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.filename === 'string' &&
    typeof value.type === 'string' &&
    typeof value.riskScore === 'number' &&
    Array.isArray(value.missingClauses) &&
    Array.isArray(value.recommendations) &&
    Array.isArray(value.riskFlags) &&
    Array.isArray(value.clauseChecks)
  );
}

function isDetailResponse(value: unknown): value is DetailResponse {
  return isRecord(value) && isContractAnalysis(value.data);
}

function formatDate(value: string): string {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
}

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


function getQualityScore(item: ContractAnalysisSummaryWithQuality): number | null {
  if (typeof item.qualityReview?.qualityScore === 'number') {
    return item.qualityReview.qualityScore;
  }

  if (typeof item.qualityScore === 'number') {
    return item.qualityScore;
  }

  return null;
}


function shortHash(value: string | undefined): string {
  if (!value) return 'Not available';
  return value.length > 14 ? `${value.slice(0, 14)}…` : value;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function AnalysisHistory({ onSelect, onDelete, onClearAll }: AnalysisHistoryProps): ReactElement {
  const [items, setItems] = useState<ContractAnalysisSummaryWithQuality[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadHistory(): Promise<void> {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch('/api/contracts/history');
        const payload = await readJson(response);

        if (!response.ok) {
          throw new Error('The saved analyses could not be loaded.');
        }

        if (!isHistoryResponse(payload)) {
          throw new Error('The server returned an unexpected history response.');
        }

        if (isMounted) {
          setItems(payload.data);
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'The saved analyses could not be loaded.';

        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleViewResult(id: string): Promise<void> {
    setSelectedId(id);
    setError('');

    try {
      const response = await fetch(`/api/contracts/${encodeURIComponent(id)}`);
      const payload = await readJson(response);

      if (!response.ok) {
        throw new Error('The saved analysis could not be opened.');
      }

      if (isDetailResponse(payload)) {
        onSelect(payload.data);
        return;
      }

      if (isContractAnalysis(payload)) {
        onSelect(payload);
        return;
      }

      throw new Error('The server returned an unexpected saved analysis response.');
    } catch (viewError) {
      const message = viewError instanceof Error ? viewError.message : 'The saved analysis could not be opened.';
      setError(message);
    } finally {
      setSelectedId(null);
    }
  }

  async function handleDeleteResult(id: string, filename: string): Promise<void> {
    const confirmed = window.confirm(
      `Delete the saved analysis for "${filename}"? If this result is the cache source, that cached match will also be invalidated.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setError('');

    try {
      const response = await fetch(`/api/contracts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('The saved analysis could not be deleted.');
      }

      setItems((currentItems) => currentItems.filter((item) => item.id !== id));
      onDelete?.(id);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'The saved analysis could not be deleted.';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleClearAll(): Promise<void> {
    if (items.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      'Delete all saved analyses and clear the full cache index? The original uploaded documents are not stored, so this only removes saved outcomes.'
    );

    if (!confirmed) {
      return;
    }

    setIsClearing(true);
    setError('');

    try {
      const response = await fetch('/api/contracts/history', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('The saved analyses could not be cleared.');
      }

      setItems([]);
      onClearAll?.();
    } catch (clearError) {
      const message = clearError instanceof Error ? clearError.message : 'The saved analyses could not be cleared.';
      setError(message);
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <section
      style={{
        background: '#ffffff',
        border: '1px solid #ead3dd',
        borderRadius: 28,
        padding: '1.5rem',
        boxShadow: '0 24px 70px rgba(95, 22, 56, 0.08)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, color: ruby, fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Saved outcomes
          </p>
          <h2 style={{ margin: '0.25rem 0 0', color: rubyDark }}>Analysis history</h2>
          <p style={{ margin: '0.5rem 0 0', color: muted, lineHeight: 1.6 }}>
            Previously generated or cache-returned outcomes are stored here so users can review them without re-running AI.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span
            style={{
              borderRadius: 999,
              padding: '0.45rem 0.75rem',
              background: '#fbf3f7',
              color: ruby,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            {items.length} saved
          </span>

          <button
            type="button"
            onClick={() => void handleClearAll()}
            disabled={items.length === 0 || isLoading || isClearing}
            style={{
              border: '1px solid #fecdd3',
              borderRadius: 999,
              padding: '0.45rem 0.75rem',
              background: items.length === 0 || isClearing ? '#f8fafc' : '#fff1f2',
              color: items.length === 0 || isClearing ? '#94a3b8' : '#9f1239',
              cursor: items.length === 0 || isClearing ? 'not-allowed' : 'pointer',
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            {isClearing ? 'Clearing...' : 'Clear all'}
          </button>
        </div>
      </div>

      {isLoading ? <p style={{ color: muted }}>Loading saved analyses...</p> : null}

      {error ? (
        <div
          role="alert"
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#fff1f2',
            color: '#9f1239',
            border: '1px solid #fecdd3',
            borderRadius: 16,
          }}
        >
          {error}
        </div>
      ) : null}

      {!isLoading && items.length === 0 ? (
        <p style={{ marginTop: '1rem', color: muted }}>No saved analyses yet. Upload a contract to create the first saved outcome.</p>
      ) : null}

      <div style={{ marginTop: '1.25rem', display: 'grid', gap: '0.85rem' }}>
        {items.map((item) => {
          const qualityScore = getQualityScore(item);

          return (
            <article
              key={item.id}
              style={{
                border: '1px solid #ead3dd',
                borderRadius: 18,
                padding: '1rem',
                background: '#fffafd',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: '1rem',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, color: '#1f2933' }}>{item.filename}</h3>
                  <span style={{ borderRadius: 999, background: '#e0f2fe', color: '#075985', padding: '0.25rem 0.55rem', fontWeight: 800, fontSize: '0.8rem' }}>
                    {item.type}
                  </span>
                  <span style={{ borderRadius: 999, background: item.fromCache ? '#ecfdf5' : '#eff6ff', color: item.fromCache ? '#166534' : '#1d4ed8', padding: '0.25rem 0.55rem', fontWeight: 800, fontSize: '0.8rem' }}>
                    {item.fromCache ? 'Cache hit' : 'Generated'}
                  </span>
                </div>

                <dl
                  style={{
                    margin: '0.75rem 0 0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                    gap: '0.65rem',
                    color: muted,
                  }}
                >
                  <div>
                    <dt style={{ fontSize: '0.78rem' }}>Saved</dt>
                    <dd style={{ margin: 0, color: '#1f2933', fontWeight: 700 }}>{formatDate(item.createdAt)}</dd>
                  </div>

                  <div>
                    <dt style={{ fontSize: '0.78rem' }}>Risk score</dt>
                    <dd style={{ margin: 0, color: riskColour(item.riskScore), fontWeight: 900 }}>
                      {item.riskScore} / 100
                    </dd>
                  </div>

                  <div>
                    <dt style={{ fontSize: '0.78rem' }}>Quality score</dt>
                    <dd
                      style={{
                        margin: 0,
                        color: qualityScore == null ? '#64748b' : qualityColour(qualityScore),
                        fontWeight: 900,
                      }}
                    >
                      {qualityScore == null ? 'Not judged' : `${qualityScore} / 100`}
                    </dd>
                    {qualityScore != null ? (
                      <p
                        style={{
                          margin: '0.15rem 0 0',
                          color: qualityColour(qualityScore),
                          fontSize: '0.72rem',
                          fontWeight: 800,
                        }}
                      >
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <dt style={{ fontSize: '0.78rem' }}>Document hash</dt>
                    <dd style={{ margin: 0, color: '#1f2933', fontWeight: 700 }}>{shortHash(item.documentHash)}</dd>
                  </div>

                  <div>
                    <dt style={{ fontSize: '0.78rem' }}>Model</dt>
                    <dd style={{ margin: 0, color: '#1f2933', fontWeight: 700 }}>{item.modelName ?? 'Not available'}</dd>
                  </div>
                </dl>
              </div>

              <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => void handleViewResult(item.id)}
                  disabled={selectedId === item.id || deletingId === item.id || isClearing}
                  style={{
                    border: 0,
                    borderRadius: 999,
                    padding: '0.75rem 1rem',
                    background: selectedId === item.id ? '#b8a1ad' : ruby,
                    color: '#ffffff',
                    cursor: selectedId === item.id || deletingId === item.id || isClearing ? 'not-allowed' : 'pointer',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedId === item.id ? 'Opening...' : 'View result'}
                </button>

                <button
                  type="button"
                  onClick={() => void handleDeleteResult(item.id, item.filename)}
                  disabled={selectedId === item.id || deletingId === item.id || isClearing}
                  style={{
                    border: '1px solid #fecdd3',
                    borderRadius: 999,
                    padding: '0.75rem 1rem',
                    background: deletingId === item.id ? '#f8fafc' : '#fff1f2',
                    color: deletingId === item.id ? '#94a3b8' : '#9f1239',
                    cursor: selectedId === item.id || deletingId === item.id || isClearing ? 'not-allowed' : 'pointer',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {deletingId === item.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}