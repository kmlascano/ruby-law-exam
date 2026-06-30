# Contract Analysis Feature — Senior Developer Exam

> This repository is used for the **Ruby Law** senior full-stack developer hiring exam.  
> If you found this as a candidate: welcome. Read everything below carefully before writing any code.

---

## Your task in one sentence

Build a small, well-engineered **Contract Upload & AI Analysis** feature in Node.js + React using TypeScript.

Read the full exam specification here: **[EXAM.md](./EXAM.md)**

---

## How to submit

1. **Fork this repository** (button top-right on GitHub) — do NOT clone and create a new repo
2. Create your working branch:
   ```bash
   git checkout -b candidate/<your-github-username>
   ```
   Example: `candidate/jane-smith`
3. Do all your work on that branch
4. When you are done, open a **Pull Request** from `candidate/<your-github-username>` → `main`
5. Fill in the PR template that appears automatically

> **Deadline:** 48 hours from when you receive this link. The PR timestamp is your submission time.

---

## Starter structure

This repo gives you a minimal starting point. You are free to reorganise it.

```
/
├── backend/                # Express + TypeScript API
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── index.ts
│   ├── tsconfig.json
│   └── package.json
├── frontend/               # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
├── .env.example            # Copy to .env and fill in your keys
├── EXAM.md                 # Full specification (read this first)
└── README.md               # This file
```

---

## Local setup

```bash
# 1. Fork this repo on GitHub, then clone YOUR fork
git clone https://github.com/<your-username>/ruby-law-exam.git
cd ruby-law-exam

# 2. Create your branch
git checkout -b candidate/<your-github-username>

# 3. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 4. Set up environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 5. Run backend (port 3001)
cd backend && npm run dev

# 6. Run frontend in a second terminal (port 5173)
cd frontend && npm run dev
```

---

## Questions?

Open a GitHub Issue in this repo with the label **`question`**.  
We check during business hours (Mon–Fri, 9am–6pm AEST).

Do not email. All communication goes through GitHub Issues so every candidate has the same information.

---

## Notes for candidates

- You are **expected and encouraged** to use AI coding assistants (Copilot, Cursor, Claude, etc.)
- You **will be asked to explain your code** in the 45-minute review call — know what you submitted
- We value a **small, clean, working slice** over a large, incomplete mess
- Read the full evaluation criteria in [EXAM.md](./EXAM.md) before you start so you know what we weight

---

_Good luck._
