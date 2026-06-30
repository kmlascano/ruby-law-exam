# Sample Contracts

These three fictional contracts are provided for you to test your implementation against.
All companies, people, and details are entirely made up.

| File | Contract type | What to expect from AI analysis |
|------|--------------|----------------------------------|
| `sample-nda.txt` | Non-Disclosure Agreement | Low risk score. Complete and well-formed. Minor recommendations only. |
| `sample-employment-agreement.txt` | Employment Agreement | Medium risk. Several standard clauses are intentionally missing (termination, IP assignment, restraint of trade, governing law). |
| `sample-service-agreement.txt` | Services Agreement | High risk for the client. Contains intentionally weak liability cap, ambiguous language in clause 5, and missing privacy/insurance clauses. |

## How to use

1. Upload each file through your UI
2. Verify that the AI correctly identifies the contract type
3. Check that the risk scores differ meaningfully across the three files
4. Confirm that the missing clauses and recommendations are relevant and accurate

## Format note

These files are plain text (`.txt`). Your file parser should handle `.pdf` and `.docx` in production.
For testing purposes, you may convert these to PDF or DOCX using any tool (e.g. Word, LibreOffice, or an online converter), or adapt your `extractorService` to also accept `.txt` during development.
