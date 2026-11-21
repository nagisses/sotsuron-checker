import path from 'node:path';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const { loadLocalEnvFiles, resolveServerApiKey } = await import(
  path.join(PROJECT_ROOT, 'dist-server', 'envLoader.mjs')
);
const { analyzeManuscriptWithGemini, runBenchmarksWithGemini } = await import(
  path.join(PROJECT_ROOT, 'dist-server', 'geminiClient.mjs')
);

loadLocalEnvFiles(PROJECT_ROOT);
const apiKey = resolveServerApiKey(null);

if (!apiKey) {
  console.error(
    JSON.stringify({
      status: 'MISSING_API_KEY',
      message:
        'Set GEMINI_API_KEY in .env.local or your shell environment before running verify:gemini.',
    }),
  );
  process.exit(2);
}

const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

const benchmarkReport = await runBenchmarksWithGemini({ apiKey, model });

const sampleDraft = [
  'Phase-adaptive surface coatings attenuate midday canyon heat flux across high-density streets while preserving winter heating efficiency above 14C transitions.',
  'Instrumentation at two downtown intersections suggests ten-year maintenance-free heat-stress elimination district-wide.',
  'Because emergency heat-stroke admissions fell 34% in the resurfacing year, the reflective pavement directly caused the medical reduction without cooling-shelter effects.',
  'Redirecting solar radiation upward universally improves urban energy balance across all dense low-rise neighborhoods.',
].join('\n\n');

const manuscriptReport = await analyzeManuscriptWithGemini({
  apiKey,
  manuscriptText: sampleDraft,
  title: 'Adaptive Albedo Live Verification Draft',
  domain: 'Urban Climatology',
  model,
});

console.log(
  JSON.stringify(
    {
      status: 'PASS',
      model,
      benchmarkSummary: {
        agreementCount: benchmarkReport.agreementCount,
        total: benchmarkReport.total,
      },
      benchmarkResults: benchmarkReport.results.map((r) => ({
        benchmarkId: r.benchmarkId,
        detectedIssueCategory: r.detectedIssueCategory,
        detectedSeverity: r.detectedSeverity,
        categoryMatch: r.categoryMatch,
        severityMatch: r.severityMatch,
        confidence: r.confidence,
        rationale: r.rationale,
        missingEvidence: r.missingEvidence,
        suggestedRevision: r.suggestedRevision,
        uncertaintyNote: r.uncertaintyNote,
        latencyMs: r.latencyMs,
      })),
      manuscriptSummary: {
        thesisId: manuscriptReport.bundle.graph.id,
        nodeCount: manuscriptReport.bundle.graph.nodes.length,
        edgeCount: manuscriptReport.bundle.graph.edges.length,
        statuses: manuscriptReport.bundle.graph.nodes.map((n) => `${n.id}:${n.status}`),
        groundingReport: manuscriptReport.bundle.groundingReport,
        latencyMs: manuscriptReport.latencyMs,
      },
    },
    null,
    2,
  ),
);
