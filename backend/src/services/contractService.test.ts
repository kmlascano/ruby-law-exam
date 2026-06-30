import { describe, it, expect, vi } from 'vitest';

// Example test structure — replace with your real tests
// The AI service should be mocked so tests do not make real API calls

describe('contractService', () => {
  it('TODO: returns a valid ContractAnalysis when upload succeeds', async () => {
    // Arrange: mock aiService.callAI and extractorService.extractText
    // Act: call analyseContract(...)
    // Assert: result has id, type, riskScore, missingClauses, recommendations
    expect(true).toBe(true); // replace this
  });

  it('TODO: throws when the AI service is unavailable', async () => {
    // Arrange: mock callAI to throw
    // Act + Assert: analyseContract should propagate the error
    expect(true).toBe(true); // replace this
  });
});
