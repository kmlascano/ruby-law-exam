import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendRoot = path.resolve(__dirname, '..');
const contractsDir = path.join(backendRoot, 'eval', 'contracts');
const casesPath = path.join(backendRoot, 'eval', 'contract-eval-cases.json');
const resultsDir = path.join(backendRoot, 'eval', 'results');

const BASE_URL = process.env.EVAL_BASE_URL ?? 'http://localhost:3001';

/**
 * Normal mode:
 *   npm run eval:contracts
 *   -> runs all cases in backend/eval/contract-eval-cases.json
 *
 * Run every PDF under backend/eval/contracts, even if no case exists:
 *   EVAL_RUN_ALL_FILES=true npm run eval:contracts
 *
 * Run only selected files or case IDs:
 *   EVAL_ONLY_FILES="01_standard_nda_low_risk.pdf,07_nda_prompt_injection_adversarial.pdf" npm run eval:contracts
 */
const RUN_ALL_CONTRACT_FILES = process.env.EVAL_RUN_ALL_FILES === 'true';

const ONLY_FILES = (process.env.EVAL_ONLY_FILES ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let startedBackend = null;

async function isBackendReachable() {
  try {
    const response = await fetch(BASE_URL);
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  }
}

async function waitForBackend() {
  const startedAt = Date.now();
  const timeoutMs = 45_000;

  while (Date.now() - startedAt < timeoutMs) {
    if (await isBackendReachable()) {
      return;
    }

    await sleep(500);
  }

  throw new Error(`Backend did not respond at ${BASE_URL} within ${timeoutMs / 1000}s.`);
}

async function assertBackendReachable() {
  if (await isBackendReachable()) {
    console.log(`Backend already running at ${BASE_URL}`);
    return;
  }

  console.log(`Backend is not running at ${BASE_URL}. Starting it now...`);
  console.log('');

  startedBackend = spawn('npm', ['run', 'dev:backend'], {
    cwd: path.resolve(backendRoot, '..'),
    env: {
      ...process.env,
      ENABLE_LLM_JUDGE: process.env.ENABLE_LLM_JUDGE ?? 'false',
      OPENAI_REASONING_EFFORT: process.env.OPENAI_REASONING_EFFORT ?? 'low',
      EVAL_BASE_URL: BASE_URL,
    },
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  startedBackend.stdout.on('data', (chunk) => {
    process.stdout.write(`[backend] ${chunk.toString()}`);
  });

  startedBackend.stderr.on('data', (chunk) => {
    process.stderr.write(`[backend] ${chunk.toString()}`);
  });

  await waitForBackend();

  console.log('');
  console.log(`Backend is ready at ${BASE_URL}`);
  console.log('');
}

function stopStartedBackend() {
  if (!startedBackend) return;

  console.log('');
  console.log('Stopping eval backend...');

  startedBackend.kill('SIGTERM');

  setTimeout(() => {
    startedBackend?.kill('SIGKILL');
  }, 3000);
}

async function findFileByBasename(rootDir, targetBasename) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const normalisedTarget = normaliseFilename(targetBasename);

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isFile()) {
      if (entry.name === targetBasename) {
        return entryPath;
      }

      // Allows matching files like:
      // 01_standard_nda_low_risk(3).pdf
      // against:
      // 01_standard_nda_low_risk.pdf
      if (normaliseFilename(entry.name) === normalisedTarget) {
        return entryPath;
      }
    }

    if (entry.isDirectory()) {
      const found = await findFileByBasename(entryPath, targetBasename);

      if (found) {
        return found;
      }
    }
  }

  return null;
}

async function findFilesByExtension(rootDir, extension) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findFilesByExtension(entryPath, extension)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) {
      files.push(entryPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function resolveContractFile(fileFromCase) {
  const exactPath = path.join(contractsDir, fileFromCase);

  try {
    const exactStat = await stat(exactPath);

    if (exactStat.isFile()) {
      return exactPath;
    }
  } catch {
    // Fall through to basename search.
  }

  const basename = path.basename(fileFromCase);
  const fallbackPath = await findFileByBasename(contractsDir, basename);

  if (fallbackPath) {
    return fallbackPath;
  }

  throw new Error(
    `Contract PDF not found: ${fileFromCase}. Looked for exact path and basename "${basename}" under ${contractsDir}`
  );
}

function normaliseFilename(value) {
  return path
    .basename(String(value ?? ''))
    .replace(/\s*\(\d+\)(?=\.[^.]+$|$)/, '')
    .toLowerCase()
    .trim();
}

function normaliseText(value) {
  return JSON.stringify(value ?? {})
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normaliseBand(value) {
  if (value === null || value === undefined) return null;

  const band = String(value)
    .toLowerCase()
    .replace(/\brisk\b/g, '')
    .replace(/_/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  if (!band) return null;

  if (band.includes('extraction failure') || band.includes('extraction error')) {
    return 'extraction failure';
  }

  if (band.includes('medium-high') || band.includes('medium high')) {
    return 'medium-high';
  }

  if (band.includes('low-medium') || band.includes('low medium')) {
    return 'low-medium';
  }

  if (band === 'high') return 'high';
  if (band === 'medium') return 'medium';
  if (band === 'low') return 'low';

  return band;
}

function getBandFromScore(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return 'unknown';
  }

  if (score >= 70) return 'high';
  if (score >= 55) return 'medium-high';
  if (score >= 35) return 'medium';
  if (score >= 20) return 'low-medium';
  return 'low';
}

function getBand(score, explicitBand) {
  return normaliseBand(explicitBand) ?? getBandFromScore(score);
}

function acceptedBands(expectedBand) {
  if (!expectedBand) return [];

  const raw = String(expectedBand).toLowerCase();
  const bands = [];

  if (raw.includes('extraction failure') || raw.includes('extraction error')) {
    bands.push('extraction failure');
  }

  if (raw.includes('medium-high') || raw.includes('medium high')) {
    bands.push('medium-high');
  }

  if (raw.includes('low-medium') || raw.includes('low medium')) {
    bands.push('low-medium');
  }

  const withoutCompositeBands = raw
    .replace(/medium[-\s]?high/g, '')
    .replace(/low[-\s]?medium/g, '');

  if (/\bhigh\b/.test(withoutCompositeBands)) {
    bands.push('high');
  }

  if (/\bmedium\b/.test(withoutCompositeBands)) {
    bands.push('medium');
  }

  if (/\blow\b/.test(withoutCompositeBands)) {
    bands.push('low');
  }

  return [...new Set(bands)];
}

function bandMatches(actualBand, expectedBand) {
  const accepted = acceptedBands(expectedBand);

  if (accepted.length === 0) return true;

  return accepted.includes(normaliseBand(actualBand));
}

function normaliseType(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/non-disclosure agreement/g, 'nda')
    .replace(/nondisclosure agreement/g, 'nda')
    .replace(/confidentiality agreement/g, 'nda')
    .replace(/services agreement/g, 'service agreement')
    .replace(/employment agreement/g, 'employment')
    .replace(/lease agreement/g, 'lease')
    .replace(/\s+/g, ' ')
    .trim();
}

function acceptedTypes(expectedType) {
  if (!expectedType) return [];

  const raw = String(expectedType).toLowerCase();
  const accepted = [];

  if (raw.includes('nda') || raw.includes('non-disclosure') || raw.includes('nondisclosure')) {
    accepted.push('nda');
  }

  if (raw.includes('employment')) {
    accepted.push('employment');
  }

  if (raw.includes('service agreement') || raw.includes('services agreement')) {
    accepted.push('service agreement');
  }

  if (raw.includes('lease')) {
    accepted.push('lease');
  }

  if (raw.includes('other')) {
    accepted.push('other');
  }

  return [...new Set(accepted)];
}

function typeMatches(actualType, expectedType) {
  const accepted = acceptedTypes(expectedType);

  if (accepted.length === 0) return true;

  return accepted.includes(normaliseType(actualType));
}

function getAnalysis(payload) {
  if (payload && typeof payload === 'object' && payload.data) {
    return payload.data;
  }

  return payload;
}

function passFail(condition) {
  return condition ? 'PASS' : 'FAIL';
}

function getExpectedType(testCase) {
  return testCase.expectedType ?? testCase.expected_type;
}

function getExpectedBand(testCase) {
  return testCase.expectedBand ?? testCase.expected_risk_band;
}

function getScoreMin(testCase) {
  return testCase.scoreMin ?? testCase.score_min;
}

function getScoreMax(testCase) {
  return testCase.scoreMax ?? testCase.score_max;
}

function getMentionGroups(testCase) {
  return testCase.mustMentionAny ?? testCase.must_mention_any ?? [];
}

function allowsExtractionFailure(testCase) {
  const text = normaliseText(testCase);

  return (
    text.includes('extraction failure') ||
    text.includes('extraction error') ||
    text.includes('ocr disabled') ||
    testCase.allowExtractionFailure === true
  );
}

function isExtractionFailureAnalysis(analysis) {
  const text = normaliseText({
    error: analysis?.error,
    status: analysis?.status,
    message: analysis?.message,
    limitations: analysis?.limitations,
    summary: analysis?.summary,
  });

  return (
    text.includes('extraction failure') ||
    text.includes('extraction error') ||
    text.includes('no text could be parsed') ||
    text.includes('ocr') ||
    text.includes('image-only') ||
    text.includes('unreadable')
  );
}

function extractRiskScore(analysis) {
  const candidates = [
    analysis?.riskScore,
    analysis?.risk_score,
    analysis?.score,
    analysis?.riskAssessment?.score,
    analysis?.risk?.score,
  ];

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;

    const number = Number(candidate);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function extractRiskBand(analysis) {
  return (
    analysis?.riskBand ??
    analysis?.risk_band ??
    analysis?.riskLevel ??
    analysis?.risk_level ??
    analysis?.riskAssessment?.band ??
    analysis?.risk?.band
  );
}

function extractType(analysis) {
  return (
    analysis?.type ??
    analysis?.contractType ??
    analysis?.contract_type ??
    analysis?.documentType ??
    analysis?.document_type
  );
}

function itemLabel(item) {
  if (item === null || item === undefined) return '';

  if (typeof item === 'string') return item;

  if (typeof item === 'object') {
    return (
      item.title ??
      item.name ??
      item.clause ??
      item.issue ??
      item.finding ??
      item.recommendation ??
      item.description ??
      JSON.stringify(item)
    );
  }

  return String(item);
}

function itemLabels(items) {
  if (!Array.isArray(items)) return [];

  return items.map(itemLabel).filter(Boolean);
}

function checkMentionGroups(analysis, mentionGroups) {
  const text = normaliseText({
    summary: analysis?.summary,
    keyFindings: analysis?.keyFindings,
    key_findings: analysis?.key_findings,
    missingClauses: analysis?.missingClauses,
    missing_clauses: analysis?.missing_clauses,
    recommendations: analysis?.recommendations,
    riskFlags: analysis?.riskFlags,
    risk_flags: analysis?.risk_flags,
    clauseChecks: analysis?.clauseChecks,
    clause_checks: analysis?.clause_checks,
    limitations: analysis?.limitations,
    issues: analysis?.issues,
    findings: analysis?.findings,
  });

  return mentionGroups.map((group) => {
    const matched = group.some((term) => text.includes(String(term).toLowerCase()));

    return {
      expectedAnyOf: group,
      matched,
    };
  });
}

async function uploadPdf(filePath) {
  const buffer = await readFile(filePath);
  const fileName = path.basename(filePath);

  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'application/pdf' });

  formData.append('file', blob, fileName);

  const response = await fetch(`${BASE_URL}/api/contracts/upload`, {
    method: 'POST',
    body: formData,
  });

  const responseText = await response.text();

  let payload = null;

  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = responseText;
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
    responseText,
  };
}

async function loadConfiguredCases() {
  const casesRaw = await readFile(casesPath, 'utf8');

  return JSON.parse(casesRaw);
}

async function loadCases() {
  const configuredCases = await loadConfiguredCases();

  if (!RUN_ALL_CONTRACT_FILES) {
    return filterCases(configuredCases);
  }

  const pdfFiles = await findFilesByExtension(contractsDir, '.pdf');

  const casesByFile = new Map(
    configuredCases.map((testCase) => [
      normaliseFilename(testCase.file),
      testCase,
    ])
  );

  const allPdfCases = pdfFiles.map((filePath) => {
    const relativeFile = path.relative(contractsDir, filePath);
    const matchingCase = casesByFile.get(normaliseFilename(relativeFile));

    return {
      ...(matchingCase ?? {}),
      id:
        matchingCase?.id ??
        path.basename(relativeFile, path.extname(relativeFile)),
      file: matchingCase?.file ?? relativeFile,
      hasExpectedChecks: Boolean(matchingCase),
    };
  });

  return filterCases(allPdfCases);
}

function filterCases(cases) {
  if (ONLY_FILES.length === 0) {
    return cases;
  }

  const wanted = new Set(
    ONLY_FILES.flatMap((value) => [
      String(value).toLowerCase().trim(),
      normaliseFilename(value),
    ])
  );

  const filtered = cases.filter((testCase) => {
    const id = String(testCase.id ?? '').toLowerCase().trim();
    const file = String(testCase.file ?? '').toLowerCase().trim();
    const normalisedFile = normaliseFilename(testCase.file);

    return wanted.has(id) || wanted.has(file) || wanted.has(normalisedFile);
  });

  const matched = new Set(
    filtered.flatMap((testCase) => [
      String(testCase.id ?? '').toLowerCase().trim(),
      String(testCase.file ?? '').toLowerCase().trim(),
      normaliseFilename(testCase.file),
    ])
  );

  const missing = ONLY_FILES.filter((value) => {
    const raw = String(value).toLowerCase().trim();
    const normalised = normaliseFilename(value);

    return !matched.has(raw) && !matched.has(normalised);
  });

  if (missing.length > 0) {
    throw new Error(
      `Could not find eval cases/files for:\n${missing.map((x) => `- ${x}`).join('\n')}`
    );
  }

  return filtered;
}

async function runCase(testCase) {
  const filePath = await resolveContractFile(testCase.file);
  const upload = await uploadPdf(filePath);

  const expectedType = getExpectedType(testCase);
  const expectedBand = getExpectedBand(testCase);
  const scoreMin = getScoreMin(testCase);
  const scoreMax = getScoreMax(testCase);
  const mentionGroups = getMentionGroups(testCase);

  if (!upload.ok) {
    const extractionFailureAllowed = allowsExtractionFailure(testCase);

    return {
      id: testCase.id,
      file: testCase.file,
      passed: extractionFailureAllowed,
      status: upload.status,
      expected: {
        type: expectedType,
        band: expectedBand,
        scoreMin,
        scoreMax,
        allowsExtractionFailure: extractionFailureAllowed,
      },
      actual: {
        type: null,
        score: null,
        band: extractionFailureAllowed ? 'extraction failure' : 'unknown',
        uploadFailed: true,
        response: upload.payload,
      },
      mentionChecks: [],
      failures: extractionFailureAllowed
        ? []
        : [`Upload failed with status ${upload.status}`],
    };
  }

  const analysis = getAnalysis(upload.payload);

  if (!analysis || typeof analysis !== 'object') {
    return {
      id: testCase.id,
      file: testCase.file,
      passed: false,
      status: upload.status,
      expected: {
        type: expectedType,
        band: expectedBand,
        scoreMin,
        scoreMax,
      },
      actual: {
        type: null,
        score: null,
        band: 'unknown',
        response: upload.payload,
      },
      mentionChecks: [],
      failures: ['Upload response did not contain an analysis object.'],
    };
  }

  const actualType = extractType(analysis);
  const actualScore = extractRiskScore(analysis);
  const actualBand = getBand(actualScore, extractRiskBand(analysis));

  const extractionFailure = isExtractionFailureAnalysis(analysis);
  const extractionFailureAllowed = allowsExtractionFailure(testCase);

  if (extractionFailure && extractionFailureAllowed) {
    return {
      id: testCase.id,
      file: testCase.file,
      passed: true,
      status: upload.status,
      expected: {
        type: expectedType,
        band: expectedBand,
        scoreMin,
        scoreMax,
        allowsExtractionFailure: true,
      },
      actual: {
        type: actualType,
        score: actualScore,
        band: 'extraction failure',
        extractionFailure: true,
        summary: analysis.summary,
        limitations: analysis.limitations,
        rawAnalysis: analysis,
      },
      mentionChecks: [],
      failures: [],
    };
  }

  const mentionChecks = checkMentionGroups(analysis, mentionGroups);
  const failures = [];

  if (expectedType && !typeMatches(actualType, expectedType)) {
    failures.push(`Expected type ${expectedType}, got ${actualType}`);
  }

  if (expectedBand && !bandMatches(actualBand, expectedBand)) {
    failures.push(`Expected band ${expectedBand}, got ${actualBand} with score ${actualScore}`);
  }

  if (typeof scoreMin === 'number') {
    if (typeof actualScore !== 'number' || actualScore < scoreMin) {
      failures.push(`Expected score >= ${scoreMin}, got ${actualScore}`);
    }
  }

  if (typeof scoreMax === 'number') {
    if (typeof actualScore !== 'number' || actualScore > scoreMax) {
      failures.push(`Expected score <= ${scoreMax}, got ${actualScore}`);
    }
  }

  for (const check of mentionChecks) {
    if (!check.matched) {
      failures.push(`Expected analysis to mention one of: ${check.expectedAnyOf.join(', ')}`);
    }
  }

  const riskFlags = analysis.riskFlags ?? analysis.risk_flags;
  const missingClauses = analysis.missingClauses ?? analysis.missing_clauses;

  return {
    id: testCase.id,
    file: testCase.file,
    passed: failures.length === 0,
    status: upload.status,
    expected: {
      type: expectedType,
      band: expectedBand,
      scoreMin,
      scoreMax,
      hasExpectedChecks: testCase.hasExpectedChecks !== false,
    },
    actual: {
      type: actualType,
      score: actualScore,
      band: actualBand,

      summary: analysis.summary,
      limitations: analysis.limitations,

      missingClauses,
      missingClauseTitles: itemLabels(missingClauses),

      recommendations: analysis.recommendations,

      riskFlags,
      riskFlagTitles: itemLabels(riskFlags),

      clauseChecks: analysis.clauseChecks ?? analysis.clause_checks,

      rawAnalysis: analysis,
    },
    mentionChecks,
    failures,
  };
}

function printActualSummary(result) {
  if (!result.actual) return;

  console.log(`   type: ${result.actual.type ?? 'unknown'}`);
  console.log(`   score: ${result.actual.score ?? 'unknown'}`);
  console.log(`   band: ${result.actual.band ?? 'unknown'}`);

  const riskFlagTitles = result.actual.riskFlagTitles ?? [];

  if (Array.isArray(riskFlagTitles) && riskFlagTitles.length > 0) {
    console.log(`   risk flags: ${riskFlagTitles.join(' | ')}`);
  }

  const missingClauseTitles = result.actual.missingClauseTitles ?? [];

  if (Array.isArray(missingClauseTitles) && missingClauseTitles.length > 0) {
    console.log(`   missing clauses: ${missingClauseTitles.join(' | ')}`);
  }

  if (result.actual.summary) {
    const summary = String(result.actual.summary).replace(/\s+/g, ' ').trim();
    console.log(`   summary: ${summary.slice(0, 300)}${summary.length > 300 ? '...' : ''}`);
  }
}

async function main() {
  await assertBackendReachable();

  const cases = await loadCases();

  console.log(`Running ${cases.length} contract eval case(s) against ${BASE_URL}`);

  if (RUN_ALL_CONTRACT_FILES) {
    console.log(`Mode: all PDFs under ${contractsDir}`);
  } else {
    console.log(`Mode: configured cases from ${casesPath}`);
  }

  if (ONLY_FILES.length > 0) {
    console.log(`Filter: ${ONLY_FILES.join(', ')}`);
  }

  console.log('');

  const results = [];

  for (const testCase of cases) {
    process.stdout.write(`→ ${testCase.id}... `);

    try {
      const result = await runCase(testCase);
      results.push(result);

      console.log(passFail(result.passed));
      printActualSummary(result);

      if (!result.passed) {
        for (const failure of result.failures) {
          console.log(`   - ${failure}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      results.push({
        id: testCase.id,
        file: testCase.file,
        passed: false,
        failures: [message],
      });

      console.log('FAIL');
      console.log(`   - ${message}`);
    }

    console.log('');
  }

  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;

  await mkdir(resultsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(resultsDir, `contract-eval-${timestamp}.json`);

  await writeFile(
    outputPath,
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        mode: RUN_ALL_CONTRACT_FILES ? 'all-contract-files' : 'configured-cases',
        onlyFiles: ONLY_FILES,
        passed,
        failed,
        total: results.length,
        results,
      },
      null,
      2
    )
  );

  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);
  console.log(`Saved results: ${outputPath}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => {
    stopStartedBackend();
  });