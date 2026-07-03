import { useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import type { ContractAnalysis } from '../types';

type UploadFormProps = {
  onSuccess: (result: ContractAnalysis) => void;
  onError: (message: string) => void;
  onLoadingChange: (isLoading: boolean) => void;
};

type ApiError = {
  error: {
    message: string;
  };
};

type ApiSuccess = {
  data: ContractAnalysis;
};

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ruby = '#9f2d63';
const rubyDark = '#5f1638';
const muted = '#667085';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiError(value: unknown): value is ApiError {
  if (!isRecord(value)) return false;
  if (!isRecord(value.error)) return false;

  return typeof value.error.message === 'string';
}

function isContractAnalysis(value: unknown): value is ContractAnalysis {
  if (!isRecord(value)) return false;

  return (
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

function isApiSuccess(value: unknown): value is ApiSuccess {
  if (!isRecord(value)) return false;

  return isContractAnalysis(value.data);
}

function isAcceptedFile(file: File): boolean {
  return ACCEPTED_EXTENSIONS.some((extension) => file.name.toLowerCase().endsWith(extension));
}

function parseJsonSafely(text: string): unknown {
  if (!text.trim()) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getUploadErrorMessage(status: number, responseText: string, payload: unknown): string {
  if (isApiError(payload)) {
    return payload.error.message;
  }

  if (status === 422) {
    return responseText || 'The server rejected the upload. The file may not contain extractable text.';
  }

  if (status === 500) {
    return responseText || 'The server crashed while processing the contract. Check the backend terminal logs.';
  }

  return responseText || `Upload failed with status ${status}.`;
}

export function UploadForm({ onSuccess, onError, onLoadingChange }: UploadFormProps): ReactElement {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null;

    onError('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!isAcceptedFile(file)) {
      setSelectedFile(null);
      onError('Please upload a .pdf or .docx contract.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      onError('Please upload a contract that is 10 MB or smaller.');
      return;
    }

    setSelectedFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!selectedFile) {
      onError('Choose a PDF or DOCX contract first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsUploading(true);
    onLoadingChange(true);
    onError('');

    try {
      console.log('Uploading file:', {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
      });

      const response = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      const payload = parseJsonSafely(responseText);

      console.log('Upload response status:', response.status);
      console.log('Upload response body:', responseText);

      if (!response.ok) {
        const message = getUploadErrorMessage(response.status, responseText, payload);
        onError(message);
        return;
      }

      if (isApiSuccess(payload)) {
        onSuccess(payload.data);
      } else if (isContractAnalysis(payload)) {
        onSuccess(payload);
      } else {
        console.error('Unexpected server response:', payload);
        onError('The server returned an unexpected response. Check the browser console.');
        return;
      }

      setSelectedFile(null);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload request failed:', error);
      onError('The server is unavailable. Check that the backend is running.');
    } finally {
      setIsUploading(false);
      onLoadingChange(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#ffffff',
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
          <label
            htmlFor="contract-file"
            style={{
              display: 'block',
              color: rubyDark,
              fontWeight: 800,
              fontSize: '1.2rem',
              marginBottom: '0.35rem',
            }}
          >
            Upload a contract
          </label>

          <p style={{ margin: 0, color: muted, lineHeight: 1.6 }}>
            Accepted formats: PDF or DOCX, up to 10 MB. Repeated uploads reuse the saved analysis when the cache key matches.
          </p>
        </div>

        <span
          style={{
            padding: '0.4rem 0.7rem',
            borderRadius: 999,
            background: '#fbf3f7',
            color: ruby,
            fontSize: '0.82rem',
            fontWeight: 800,
            whiteSpace: 'nowrap',
          }}
        >
          Cached + saved
        </span>
      </div>

      <div
        style={{
          border: '1px dashed #d9a9bf',
          borderRadius: 22,
          background: '#fffafc',
          padding: '1.25rem',
        }}
      >
        <input
          id="contract-file"
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          disabled={isUploading}
          style={{
            width: '100%',
            color: muted,
          }}
        />

        {selectedFile ? (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.9rem 1rem',
              borderRadius: 16,
              background: '#ffffff',
              border: '1px solid #ead3dd',
              color: '#1f2933',
            }}
          >
            <span style={{ color: muted }}>Selected:</span>{' '}
            <strong style={{ color: rubyDark }}>{selectedFile.name}</strong>
          </div>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={!selectedFile || isUploading}
        style={{
          marginTop: '1.25rem',
          border: 0,
          borderRadius: 999,
          padding: '0.9rem 1.3rem',
          background: !selectedFile || isUploading ? '#b8a1ad' : ruby,
          color: 'white',
          cursor: !selectedFile || isUploading ? 'not-allowed' : 'pointer',
          fontWeight: 800,
          fontSize: '1rem',
          boxShadow: !selectedFile || isUploading ? 'none' : '0 16px 32px rgba(159, 45, 99, 0.24)',
        }}
      >
        {isUploading ? 'Checking cache and analysing...' : 'Upload and analyse'}
      </button>
    </form>
  );
}
