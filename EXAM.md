# Senior Full-Stack Developer — Take-Home Exam
## Contract Upload & AI Analysis Feature

**Duration:** 48 hours  
**Level:** Senior Full-Stack (Node.js + React)  
**Skill split:** 70% development · 30% Azure / CI-CD awareness

---

## Context

You are joining a legal-tech SaaS platform that handles contracts between clients and legal service providers. Your task is to build a self-contained **Contract Upload & Analysis** feature using Node.js + React.

This is a real-world feature close to what you will work on daily. We value **clean code, good architecture, and practical AI integration** over completeness. A smaller, well-built slice beats a rushed end-to-end mess.

---

## What you will build

| Step | Name | Description |
|------|------|-------------|
| 1 | **Upload** | User uploads a `.pdf` or `.docx` contract (max 10 MB) |
| 2 | **Classify** | System detects the contract type (e.g. NDA, Employment Agreement, Service Agreement, Lease) |
| 3 | **Analyse** | AI analyses the contract and returns: risk flags, missing standard clauses, and plain-English recommendations |
| 4 | **Display** | Results shown in a clean UI: risk score, clause checklist, recommendation list |

---

## Technical Requirements

### Stack — match these exactly
- **Runtime:** Node.js 20+
- **Backend framework:** Express + TypeScript
- **Frontend:** React 18+ + TypeScript
- **Bundler:** Vite (starter provided) or Next.js (your choice)
- **AI provider:** OpenAI API **or** Azure OpenAI — use your own free-tier key
- **File parsing:** Any OSS library (`pdf-parse`, `mammoth`, etc.)

> **API key note:** Keep your key in `.env` — never commit it. We can supply a key for the live demo call if needed.

---

### Backend must have

- `POST /api/contracts/upload` — multipart file upload, validate type & size
- `GET /api/contracts/:id` — return the stored analysis result
- Text extraction from PDF and DOCX
- AI call to classify the contract type and analyse it
- Structured JSON response:
  ```json
  {
    "id": "string",
    "type": "NDA | Employment | Service Agreement | Lease | Other",
    "riskScore": 0,
    "missingClauses": ["string"],
    "recommendations": ["string"]
  }
  ```
- Proper HTTP status codes (400, 413, 422, 500)
- In-memory or file-based storage is fine — no database required

### Frontend must have

- File upload UI (drag-and-drop or button)
- Loading / progress state while analysis runs
- Results panel showing:
  - Contract type badge
  - Risk score (colour-coded or numeric)
  - Missing clauses list
  - Recommendations list
- Error states (wrong file type, server error, etc.)

### Code quality (non-negotiable)

- TypeScript `strict: true` — no `any`
- ESLint passes with no errors (`npm run lint`)
- At least **2 unit tests** for the service layer (AI call mocked)
- `.env.example` committed listing all required keys (no real values)
- `README.md` in your submission with: setup steps, how to run tests, design decisions (1–2 paragraphs)

---

## Submission

1. **Fork** this repository — do not clone and push to a new repo
2. Create branch: `candidate/<your-github-username>`
3. All work goes on that branch
4. When done, open a **Pull Request** from your branch → `main` of this repo
5. Fill in the PR template completely (it auto-appears when you open the PR)

---

## Evaluation Criteria

| Area | Weight | What we look for |
|------|--------|-----------------|
| Architecture & separation of concerns | 20% | Controller → Service → storage layers. No business logic in routes. No `req`/`res` in services. |
| TypeScript quality | 15% | Strict types, Zod schemas where appropriate, no `any` |
| AI integration design | 20% | Structured prompt, validated output, graceful failure when API is down |
| Frontend UX | 15% | Clear loading / error / success states, readable results |
| Error handling & security | 15% | File type + size validation, no secrets committed, correct HTTP codes |
| Tests | 10% | At least 2 meaningful service-layer unit tests with mocked AI |
| README & communication | 5% | Another engineer can run this in under 5 minutes |

**Total: 100 points. Hire threshold: 70+. Strong hire: 85+.**

---

## Bonus Points (optional — only if time allows)

| Bonus | Points |
|-------|--------|
| GitHub Actions: lint + typecheck + test on every push | +5 |
| Dockerfile + Azure deployment notes | +3 |
| Stream AI analysis to frontend (SSE) | +3 |
| Clause-level risk highlighting in the document | +2 |

---

## Timeline Suggestion

| Hours | Milestone |
|-------|-----------|
| 0–2 | Fork, read spec, plan your approach |
| 2–10 | Backend: upload endpoint + file parsing |
| 10–18 | AI integration + structured JSON response |
| 18–28 | Frontend: upload UI + results panel |
| 28–40 | Tests, error handling, README |
| 40–48 | Buffer for polish or bonus items |
| 48 | Open PR — no late submissions |

---

## Sample Contracts

We will email you 3 sample files:
1. A standard NDA
2. An employment agreement with missing standard clauses
3. A service agreement with ambiguous liability language

Use these to tune your prompt and test your UI. Your code must handle arbitrary contracts — no hardcoding for these specific files.

---

## What we are NOT looking for

- A production-ready system
- Custom AI model training
- A full authentication system
- A database (in-memory is fine)
- Pixel-perfect design

---

## FAQ

**Can I use AI coding assistants (Copilot, Cursor, Claude, etc.)?**  
Yes — we expect senior engineers to use them. Be ready to explain every line in the review call.

**Can I change the folder structure?**  
Yes. Respect the architecture principles (controllers → services) but restructure as needed.

**Can I use a different UI library?**  
Yes. shadcn/ui, MUI, Tailwind, plain CSS — your choice.

**What if the OpenAI API is unavailable?**  
Your code should handle this gracefully. We won't penalise API outages.

---

## Questions?

Open a GitHub Issue tagged `question`. We monitor during business hours (Mon–Fri, 9am–6pm AEST).

---

_Good luck. We are genuinely excited to see how you approach this._
