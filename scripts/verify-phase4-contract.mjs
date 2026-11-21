import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import esbuild from 'esbuild';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const DIST_ASSETS = path.join(PROJECT_ROOT, 'dist', 'assets');
const SERVER_HANDLER_PATH = path.join(PROJECT_ROOT, 'dist-server', 'apiHandler.mjs');

// 1. Secret & Server-Only Hygiene Audit on built client assets
const jsFiles = fs.readdirSync(DIST_ASSETS).filter((f) => f.endsWith('.js'));
assert.ok(jsFiles.length >= 2, 'Expected Vite client JS bundles in dist/assets');
for (const file of jsFiles) {
  const code = fs.readFileSync(path.join(DIST_ASSETS, file), 'utf8');
  assert.ok(!code.includes('GoogleGenAI'), `Client bundle ${file} must not contain GoogleGenAI`);
  assert.ok(!code.includes('@google/genai'), `Client bundle ${file} must not contain @google/genai`);
  assert.ok(
    !code.includes('TOULMIN_SYSTEM_INSTRUCTION'),
    `Client bundle ${file} must not leak server system instruction`,
  );
}

// 2. Unit test argumentValidator.ts (sanitization, central fallback, verbatim audit, fabrication trap)
await esbuild.build({
  entryPoints: [path.join(PROJECT_ROOT, 'src/engine/argumentValidator.ts')],
  outdir: '/tmp/phase4-validator-bundle',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
});

const { validateAndSanitizeThesisGraph } = await import(
  '/tmp/phase4-validator-bundle/argumentValidator.js'
);

const sampleManuscript =
  'Salt marsh restoration sequesters organic sediment carbon across temperate estuaries. However, citing 24% flood reduction globally omits tidal range variance.';

const ungroundedCandidate = {
  id: 'thesis-test-sanitize',
  title: 'Estuarine Sediment Carbon Study',
  titleJa: '河口塩性湿地における炭素隔離評価',
  domain: 'Coastal Ecology',
  abstract: 'Evaluates carbon sequestration and flood claims.',
  nodes: [
    {
      id: 'C-1',
      code: 'C-1',
      title: 'Marsh Carbon Sequestration',
      titleJa: '湿地炭素隔離',
      role: 'claim',
      isCentral: false,
      sourceText: 'Salt marsh restoration sequesters organic sediment carbon across temperate estuaries.',
      sourceLocation: 'Paragraph 1',
      confidence: 0.85,
      status: 'healthy',
      issues: [],
    },
    {
      id: 'C-2',
      code: 'C-2 // FAULT',
      title: 'Global 24% Flood Reduction',
      titleJa: '世界24%洪水低減主張',
      role: 'claim',
      isCentral: false,
      sourceText: 'citing 24% flood reduction globally omits tidal range variance.',
      sourceLocation: 'Paragraph 2',
      confidence: 0.35,
      status: 'collapsed',
      issues: [
        {
          id: 'I-1',
          sourceText: 'citing 24% flood reduction globally omits tidal range variance.',
          issueCategory: 'overgeneralization',
          severity: 'critical',
          rationale: 'Generalizes localized storm attenuation without tidal range stratification.',
          missingEvidence: 'Multi-estuary tidal gauge records.',
          suggestedRevision:
            'Restrict flood claim to micro-tidal basins; see Smith et al. 2024 reporting 87.5% variance.',
          confidence: 0.81,
          uncertaintyNote: 'Analytical hypothesis pending hydrological dataset verification.',
          destructionType: 'structural_collapse',
        },
      ],
    },
  ],
  edges: [
    {
      id: 'E-1',
      source: 'C-2',
      target: 'C-1',
      relationshipType: 'contradicts',
      explanation: 'Overbroad generalization weakens overall synthesis.',
      integrity: 0.35,
    },
    {
      id: 'E-DANGLING',
      source: 'C-1',
      target: 'MISSING-NODE',
      relationshipType: 'supports',
      explanation: 'Dangling edge test.',
      integrity: 0.5,
    },
  ],
};

const bundle = validateAndSanitizeThesisGraph(ungroundedCandidate, sampleManuscript);
assert.equal(bundle.centralAssigned, true, 'Expected central node fallback assignment');
assert.equal(bundle.graph.nodes[0].isCentral, true);
assert.equal(bundle.repairedEdgesDropped, 1, 'Expected 1 dangling edge stripped');
assert.equal(bundle.groundingReport.checked, true);
assert.equal(bundle.groundingReport.verbatimMatchRate, 1);
assert.ok(
  bundle.groundingReport.fabricationWarnings.some((w) => w.includes('87.5%') || w.includes('et al.')),
  'Expected fabrication guardrail to flag invented percentage/citation absent from source text',
);

// 3. Test built dist-server/apiHandler.mjs contracts in-process cleanly
const { handleApiRequest } = await import(SERVER_HANDLER_PATH);

async function invokeHandler({ method, url, headers = {}, bodyText = null, generateFn }) {
  const reqStream = bodyText !== null ? Readable.from([Buffer.from(bodyText)]) : Readable.from([]);
  reqStream.method = method;
  reqStream.url = url;
  reqStream.headers = headers;

  let statusCode = 200;
  let responseHeaders = {};
  const bodyChunks = [];

  const mockRes = {
    writeHead(code, hdrs) {
      statusCode = code;
      responseHeaders = hdrs || {};
    },
    end(chunk) {
      if (chunk) bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    },
  };

  const handled = await handleApiRequest(reqStream, mockRes, { generateFn });
  const rawBody = Buffer.concat(bodyChunks).toString('utf8');
  return {
    handled,
    statusCode,
    headers: responseHeaders,
    json: rawBody ? JSON.parse(rawBody) : null,
  };
}

// Preserve & clear GEMINI_API_KEY temporarily for explicit key-missing test
const prevGeminiKey = process.env.GEMINI_API_KEY;
delete process.env.GEMINI_API_KEY;

const healthNoKey = await invokeHandler({ method: 'GET', url: '/api/health' });
assert.equal(healthNoKey.statusCode, 200);
assert.equal(healthNoKey.json.geminiConfigured, false);

const analyzeNoKey = await invokeHandler({
  method: 'POST',
  url: '/api/analyze',
  bodyText: JSON.stringify({ manuscriptText: sampleManuscript }),
});
assert.equal(analyzeNoKey.statusCode, 503);
assert.equal(analyzeNoKey.json.error, 'GEMINI_API_KEY_NOT_CONFIGURED');

const analyzeShort = await invokeHandler({
  method: 'POST',
  url: '/api/analyze',
  bodyText: JSON.stringify({ manuscriptText: 'Too short.' }),
});
assert.equal(analyzeShort.statusCode, 400);

const analyzeTooBig = await invokeHandler({
  method: 'POST',
  url: '/api/analyze',
  bodyText: 'x'.repeat(270_000),
});
assert.equal(analyzeTooBig.statusCode, 413);

const analyzeBadGeminiJson = await invokeHandler({
  method: 'POST',
  url: '/api/analyze',
  headers: { 'x-gemini-api-key': 'test-session-token' },
  bodyText: JSON.stringify({ manuscriptText: sampleManuscript }),
  generateFn: async () => '{"not_a_graph": true}',
});
assert.equal(analyzeBadGeminiJson.statusCode, 422);
assert.equal(analyzeBadGeminiJson.json.error, 'GEMINI_SCHEMA_VALIDATION_FAILED');

// Valid contract round-trip through /api/analyze (using offline deterministic fixture)
const cleanFixture = structuredClone(ungroundedCandidate);
cleanFixture.nodes[0].isCentral = true;
cleanFixture.nodes[1].issues[0].suggestedRevision =
  'Restrict flood claim to micro-tidal basins with [verified hydrological gauge data].';
cleanFixture.edges.pop();

const analyzeOk = await invokeHandler({
  method: 'POST',
  url: '/api/analyze',
  headers: { 'x-gemini-api-key': 'test-session-token' },
  bodyText: JSON.stringify({ manuscriptText: sampleManuscript, model: 'gemini-3.5-flash-lite' }),
  generateFn: async () => JSON.stringify(cleanFixture),
});
assert.equal(analyzeOk.statusCode, 200);
assert.equal(analyzeOk.json.graph.nodes.length, 2);
assert.equal(analyzeOk.json.groundingReport.fabricationWarnings.length, 0);

// Contract test /api/benchmarks across all 5 Section E cases
let benchCallIdx = 0;
const expectedMockOutputs = [
  { cat: 'none', sev: 'none', dest: 'none' },
  { cat: 'insufficient_grounds', sev: 'critical', dest: 'structural_collapse' },
  { cat: 'correlation_causation', sev: 'critical', dest: 'structural_collapse' },
  { cat: 'missing_rebuttal', sev: 'medium', dest: 'connection_failure' },
  { cat: 'unclear_source', sev: 'critical', dest: 'structural_collapse' },
];
const benchContract = await invokeHandler({
  method: 'POST',
  url: '/api/benchmarks',
  headers: { 'x-gemini-api-key': 'test-session-token' },
  bodyText: JSON.stringify({ model: 'gemini-3.5-flash-lite' }),
  generateFn: async ({ prompt }) => {
    const spec = expectedMockOutputs[benchCallIdx++];
    return JSON.stringify({
      sourceText: prompt.slice(0, 60),
      detectedIssueCategory: spec.cat,
      detectedSeverity: spec.sev,
      rationale: 'Deterministic contract validation response.',
      missingEvidence: 'Verified reference required if non-none.',
      suggestedRevision: 'Calibrate scope to stated empirical data.',
      confidence: 0.9,
      uncertaintyNote: 'Offline schema contract fixture.',
      destructionType: spec.dest,
    });
  },
});
assert.equal(benchContract.statusCode, 200);
assert.equal(benchContract.json.agreementCount, 5);
assert.equal(benchContract.json.total, 5);

if (prevGeminiKey !== undefined) process.env.GEMINI_API_KEY = prevGeminiKey;

console.log(
  JSON.stringify({
    status: 'PASS',
    clientSecretLeakCheck: 'PASS',
    validatorChecks: 'PASS',
    apiContractChecks: {
      healthStatus: healthNoKey.statusCode,
      missingKeyStatus: analyzeNoKey.statusCode,
      shortInputStatus: analyzeShort.statusCode,
      oversizePayloadStatus: analyzeTooBig.statusCode,
      invalidSchemaStatus: analyzeBadGeminiJson.statusCode,
      validAnalyzeStatus: analyzeOk.statusCode,
      benchmarkAgreement: `${benchContract.json.agreementCount}/${benchContract.json.total}`,
    },
  }),
);
