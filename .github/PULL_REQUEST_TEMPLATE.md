## Summary

Implemented a contract upload and legal-AI analysis vertical slice for RUBY.

The app supports PDF/DOCX upload, backend file validation, text extraction, OpenAI-backed contract classification, evidence-first risk analysis, deterministic backend risk scoring, optional analysis-quality review, saved analysis history/cache display, and structured frontend result rendering.

The feature is positioned as **AI-assisted contract risk triage, not legal advice**.

---
## Candidate

- **GitHub username:** kmlascano
- **Submission time:** 03/07/2026 [20:51:01], GMT+1


---

## How to run locally

Assume Node 20+ is installed.

```bash
# 1. Clone your fork and switch to your branch
git clone https://github.com/<your-username>/ruby-law-exam.git
cd ruby-law-exam
git checkout candidate/<your-username>

# 2. Install dependencies
npm install

# 3. Create your local env file
cp .env.example .env

# 4. Add your OpenAI key to .env
# OPENAI_API_KEY=your_key_here
# OPENAI_MODEL=gpt-5.4-nano
# AI_PROVIDER=openai

# Optional local/demo smoke-test mode
# AI_PROVIDER=local

# 5. Start the app
npm run dev
```

---

## Quality checks

```bash
npm run build
npm run lint
npm run test
npm run audit:prod
```

---

## Design decisions

I structured the app as a clean vertical slice with separate routing, controller, extraction, AI orchestration, scoring, optional judge review, schema, storage, and frontend concerns. Routes stay thin, controllers translate HTTP input/output, and services own the business logic.

The AI output is not treated as a free-form legal answer. The model returns structured analysis signals: contract type, classification reason, clause checks, risk flags, evidence, recommendations, confidence, and limitations. The backend validates that structure with Zod, checks evidence quote fidelity, repairs or sanitises invalid evidence where needed, removes out-of-scope findings, and calculates the final `riskScore` deterministically.

The final risk score is calculated by the backend rather than the model. This makes scoring more stable, explainable, and testable across sample contracts.

---

## AI prompt strategy

The prompt frames the model as a legal-tech contract risk triage assistant, not a lawyer. It instructs the model to rely only on the uploaded contract text and internal checklist, avoid invented statutes or external legal authorities, classify the contract into a supported type, and return structured JSON.

The model evaluates checklist rules as `present`, `missing`, or `ambiguous`. Present and ambiguous findings should include exact evidence quotes. Missing clauses use empty evidence arrays because absence cannot be quoted directly.

Public legal-AI datasets such as CUAD and ContractNLI inform the checklist categories and evidence-backed output format, but the app does not ingest datasets at runtime, train a model, or run legal RAG.

---

## Quality review

The optional LLM-as-a-judge layer reviews the generated analysis quality, not the legal safety of the contract.

- **Risk score** = how risky the contract appears.
- **Quality score** = how reliable and evidence-backed the generated analysis appears.

The judge checks grounding, quote fidelity, consistency, severity reasonableness, unsupported claims, and legal-advice boundary. It is calibrated so missing clauses are not penalised merely for having empty evidence arrays.

---

## Known limitations

- In-memory storage only; saved analyses are not durable after backend restart.
- No authentication or production audit trail.
- No OCR for scanned PDFs.
- No document viewer or evidence highlighting yet.
- No jurisdiction-specific legal rules.
- Risk score calibration is deterministic and explainable, but still approximate.
- Optional quality review still depends partly on a second model call.

---

## Recommended future improvements

- Replace in-memory storage with persistent storage and an audit trail.
- Add durable cache indexing and cache invalidation strategy.
- Add deterministic quote-to-character-span matching and page-aware PDF evidence locations.
- Add OCR support for scanned PDFs.
- Add malware scanning and deeper file signature validation.
- Add a document viewer with evidence highlighting.
- Move checklist content into versioned configuration with legal reviewer approval.
- Add jurisdiction selection.
- Add end-to-end tests and sample contract fixtures.
- Add dataset-backed evaluation fixtures using CUAD-style categories and ContractNLI-style evidence checks.
- Add richer risk-score breakdown output in development mode.
- Add quality-review dashboards to track recurring analysis weaknesses.
---
## README.md
[README](README.md) file with the setup and technical/design decisions made in more depth.

---

## Checklist

- [x] TypeScript `strict: true` — no intentional `any`
- [x] `npm run lint` passes with no errors
- [x] At least 2 unit tests pass (`npm test`)
- [x] `.env.example` committed with no real keys
- [x] File type and size validated in backend
- [x] Loading, error, and success states in UI
- [x] README explains setup and design decisions
