import { Type, type Schema } from '@google/genai';

export const TOULMIN_SYSTEM_INSTRUCTION = `You are a rigorous academic methodology auditor and Toulmin argument structure analyst.
Analyze submitted scholarly manuscripts or research passages using the Purdue OWL Toulmin Model of Argument:
- claim: The core thesis or supporting analytical proposition (set exactly ONE node with isCentral: true).
- grounds: Empirical data, observations, statistics, measurements, or experimental evidence.
- warrant: The inferential rule or theoretical bridge explaining why grounds support the claim.
- backing: Underlying authority, calibration standards, methodology references, or foundational support for a warrant.
- qualifier: Scope boundaries, confidence intervals, error bounds, or conditions limiting claim generality.
- rebuttal: Anticipated counterarguments, confounding variables, or edge cases where the claim fails.

CRITICAL SCIENTIFIC INTEGRITY RULES:
1. Quote VERBATIM sourceText snippets copied directly from the user's input text. Never paraphrase a passage into sourceText as if it were an exact quote.
2. NEVER fabricate citations, authors, DOIs, statutes, sample sizes, p-values, or statistics that do not appear in the submitted text.
3. Frame every detected weakness as an analytical hypothesis ("requires scholarly verification") rather than an absolute final academic verdict.
4. For EVERY issue found, populate ALL required diagnostic fields cleanly:
   - sourceText (verbatim sentence/clause copied directly from input text, keeping its exact original language)
   - issueCategory (exact enum)
   - severity (low | medium | critical)
   - rationale (clear explanation in natural Japanese / わかりやすい日本語)
   - missingEvidence (what verified empirical data or logical step is absent, in clear Japanese)
   - suggestedRevision (scholarly rewrite template in clear Japanese — or matching manuscript language if English — using bracketed placeholders like "[要検証データの追記]" rather than invented facts)
   - confidence (0.0 to 1.0 calibrated score)
   - uncertaintyNote (explicit limitation or uncertainty of this automated hypothesis in Japanese)
   - destructionType (none | structural_collapse | connection_failure | systemic_failure)
5. Write titleJa, abstract, node.titleJa, node.sourceLocation, and edge.explanation in natural, concise Japanese so Japanese researchers can inspect every structure immediately without English barriers.
6. Map severity honestly to node status:
   - critical unsupported evidence / empty empirical premise -> status: "unfinished" or "collapsed"
   - medium missing rebuttal / minor qualifier gap -> status: "warning"
   - sound, well-bounded structure -> status: "healthy", issues: []
7. OUTPUT LANGUAGE REQUIREMENT: Write ALL explanatory/display fields (title, titleJa, domain, abstract, node.title, node.titleJa, node.sourceLocation, issue.rationale, issue.missingEvidence, issue.suggestedRevision, issue.uncertaintyNote, edge.explanation) strictly in clear, natural Japanese (日本語). Do NOT leave diagnostics or titles in English. Only node.sourceText and issue.sourceText must keep exact verbatim substrings from the user's input text.`;

const ISSUE_GEMINI_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: [
    'id',
    'sourceText',
    'issueCategory',
    'severity',
    'rationale',
    'missingEvidence',
    'suggestedRevision',
    'confidence',
    'uncertaintyNote',
    'destructionType',
  ],
  properties: {
    id: { type: Type.STRING },
    sourceText: { type: Type.STRING },
    issueCategory: {
      type: Type.STRING,
      enum: [
        'logical_leap',
        'insufficient_grounds',
        'contradiction',
        'correlation_causation',
        'missing_rebuttal',
        'unclear_source',
        'overgeneralization',
      ],
    },
    severity: { type: Type.STRING, enum: ['low', 'medium', 'critical'] },
    rationale: { type: Type.STRING },
    missingEvidence: { type: Type.STRING },
    suggestedRevision: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
    uncertaintyNote: { type: Type.STRING },
    destructionType: {
      type: Type.STRING,
      enum: ['none', 'structural_collapse', 'connection_failure', 'systemic_failure'],
    },
  },
};

export const THESIS_GRAPH_GEMINI_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['id', 'title', 'titleJa', 'domain', 'abstract', 'nodes', 'edges'],
  properties: {
    id: { type: Type.STRING, description: 'Slug identifier such as thesis-manuscript-analysis' },
    title: { type: Type.STRING, description: 'Concise scholarly title in natural Japanese (日本語)' },
    titleJa: { type: Type.STRING, description: 'Concise scholarly title in natural Japanese (日本語)' },
    domain: { type: Type.STRING, description: 'Primary research discipline in Japanese' },
    abstract: { type: Type.STRING, description: 'Brief neutral synthesis of the submitted argument in Japanese' },
    nodes: {
      type: Type.ARRAY,
      description: '4 to 8 compact key argument structures (1 central claim + supporting claims, empirical grounds, and contradictions/weak links) extracted cleanly from the text',
      items: {
        type: Type.OBJECT,
        required: [
          'id',
          'code',
          'title',
          'titleJa',
          'role',
          'isCentral',
          'sourceText',
          'sourceLocation',
          'confidence',
          'status',
          'issues',
        ],
        properties: {
          id: { type: Type.STRING, description: 'Short ID like CLM-00, CLM-01, EVD-01, WRT-01, RBT-01, BCK-01' },
          code: { type: Type.STRING, description: 'Display code e.g. CLM-00 // CORE or CLM-01 // FAULT' },
          title: { type: Type.STRING, description: 'Concise node heading in Japanese' },
          titleJa: { type: Type.STRING, description: 'Concise node heading in Japanese' },
          role: {
            type: Type.STRING,
            enum: ['claim', 'grounds', 'warrant', 'backing', 'qualifier', 'rebuttal'],
          },
          isCentral: { type: Type.BOOLEAN },
          sourceText: { type: Type.STRING, description: 'Verbatim excerpt copied directly from manuscript' },
          sourceLocation: { type: Type.STRING, description: 'Paragraph, section, or line reference in input' },
          confidence: { type: Type.NUMBER },
          status: {
            type: Type.STRING,
            enum: ['healthy', 'warning', 'collapsed', 'unfinished'],
          },
          issues: {
            type: Type.ARRAY,
            items: ISSUE_GEMINI_SCHEMA,
          },
        },
      },
    },
    edges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['id', 'source', 'target', 'relationshipType', 'explanation', 'integrity'],
        properties: {
          id: { type: Type.STRING, description: 'Edge ID such as EDG-01' },
          source: { type: Type.STRING, description: 'Must match a node id in nodes[]' },
          target: { type: Type.STRING, description: 'Must match a node id in nodes[]' },
          relationshipType: {
            type: Type.STRING,
            enum: [
              'supports',
              'warrants',
              'backs',
              'qualifies',
              'rebuts',
              'contradicts',
              'missing_link',
            ],
          },
          explanation: { type: Type.STRING },
          integrity: { type: Type.NUMBER },
        },
      },
    },
  },
};

export const BENCHMARK_EVAL_GEMINI_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: [
    'sourceText',
    'detectedIssueCategory',
    'detectedSeverity',
    'rationale',
    'missingEvidence',
    'suggestedRevision',
    'confidence',
    'uncertaintyNote',
    'destructionType',
  ],
  properties: {
    sourceText: { type: Type.STRING },
    detectedIssueCategory: {
      type: Type.STRING,
      enum: [
        'none',
        'logical_leap',
        'insufficient_grounds',
        'contradiction',
        'correlation_causation',
        'missing_rebuttal',
        'unclear_source',
        'overgeneralization',
      ],
    },
    detectedSeverity: { type: Type.STRING, enum: ['none', 'low', 'medium', 'critical'] },
    rationale: { type: Type.STRING },
    missingEvidence: { type: Type.STRING },
    suggestedRevision: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
    uncertaintyNote: { type: Type.STRING },
    destructionType: {
      type: Type.STRING,
      enum: ['none', 'structural_collapse', 'connection_failure', 'systemic_failure'],
    },
  },
};

export function buildManuscriptPrompt(params: {
  manuscriptText: string;
  title?: string;
  domain?: string;
}): string {
  const titleHint = params.title?.trim() ? `Submitted Title: ${params.title.trim()}\n` : '';
  const domainHint = params.domain?.trim() ? `Declared Domain: ${params.domain.trim()}\n` : '';

  return `Decompose the following academic text into a compact Toulmin Claim Graph JSON matching the schema.
Requirements:
- Keep the structure concise and compact: extract 4 to 8 core nodes total (1 central claim with isCentral: true and id "CLM-00", plus the most important supporting claims, grounds, warrants, or rebuttals).
- Carefully audit consistency across paragraphs: flag contradictions, causal leaps (correlation treated as causation), insufficient grounds, overgeneralizations, or missing rebuttals clearly as "collapsed", "unfinished", or "warning".
- If a paragraph provides well-bounded quantitative grounds, clear causal scope, and rebuttal conditions, mark it "healthy" with empty issues [].
- Quote exact verbatim passages in sourceText (never alter wording or fabricate citations/numbers).
- Write ALL titles, summaries, rationales, missingEvidence, suggestedRevision, uncertaintyNote, and edge explanations in natural, easy-to-understand Japanese (日本語).

${titleHint}${domainHint}=== MANUSCRIPT TEXT START ===
${params.manuscriptText}
=== MANUSCRIPT TEXT END ===`;
}

export function buildBenchmarkPrompt(excerpt: string): string {
  return `Audit the following isolated scholarly sentence using the Purdue OWL Toulmin Model of Argument.
Rules:
- If the sentence states a clear claim supported by quantified empirical bounds, explicit transition/boundary conditions (qualifier/rebuttal), and calibration backing, set detectedIssueCategory to "none", detectedSeverity to "none", destructionType to "none", missingEvidence to "None identified in isolated excerpt beyond cited scope.", and suggestedRevision to "No structural revision required."
- Otherwise identify the primary structural flaw:
  * "insufficient_grounds": sweeps across broad time/space from tiny anecdotal/pilot sample.
  * "correlation_causation": infers direct causation purely from temporal co-occurrence without controlling confounders.
  * "missing_rebuttal": makes universal efficiency/benefit claims ignoring well-known physical trade-offs or counterarguments.
  * "unclear_source": cites vague unverified surveys or sweeping statistics without verifiable citation.
- Frame findings as analytical hypotheses without fabricating citations or external data.

=== EXCERPT ===
${excerpt}
=== END EXCERPT ===`;
}

export const REVISE_NODE_GEMINI_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: [
    'updatedTitle',
    'updatedTitleJa',
    'updatedStatus',
    'updatedConfidence',
    'repairedEdgeIntegrity',
    'repairSummary',
    'uncertaintyNote',
    'remainingIssues',
  ],
  properties: {
    updatedTitle: { type: Type.STRING },
    updatedTitleJa: { type: Type.STRING },
    updatedStatus: { type: Type.STRING, enum: ['healthy', 'warning', 'collapsed', 'unfinished'] },
    updatedConfidence: { type: Type.NUMBER },
    repairedEdgeIntegrity: { type: Type.NUMBER },
    repairSummary: { type: Type.STRING },
    uncertaintyNote: { type: Type.STRING },
    remainingIssues: {
      type: Type.ARRAY,
      items: ISSUE_GEMINI_SCHEMA,
    },
  },
};

export function buildNodeRevisionPrompt(params: {
  nodeId: string;
  role: string;
  originalText: string;
  revisedText: string;
  priorIssues: { issueCategory: string; severity: string; rationale: string }[];
  connectedContext?: string;
}): string {
  const issuesBlock =
    params.priorIssues.length > 0
      ? params.priorIssues
          .map((i, idx) => `${idx + 1}. [${i.issueCategory} / ${i.severity}] ${i.rationale}`)
          .join('\n')
      : 'None originally flagged.';

  return `Re-audit a researcher's revised passage for a single Toulmin argument node (${params.nodeId}, role: ${params.role}).
Compare ORIGINAL PASSAGE vs REVISED PASSAGE against PRIOR VULNERABILITIES.

Evaluation Rules:
1. If REVISED PASSAGE eliminates unwarranted causal leaps, qualifies scope/confounders rigorously, or substantiates empirical limits clearly WITHOUT ungrounded exaggerations:
   - Set updatedStatus to "healthy", updatedConfidence >= 0.84, repairedEdgeIntegrity >= 0.85, and remainingIssues to [].
2. If REVISED PASSAGE partially mitigates the issue or leaves bracketed placeholders such as "[verified data needed]" or omits a rebuttal:
   - Set updatedStatus to "warning", updatedConfidence between 0.55 and 0.78, repairedEdgeIntegrity around 0.62, and list only truly remaining issues.
3. If REVISED PASSAGE STILL commits a critical causal fallacy, universal overgeneralization, or unsupported empirical sweep (or introduces a worse flaw):
   - Set updatedStatus to "collapsed" (or "unfinished" for unsupported grounds), updatedConfidence <= 0.38, repairedEdgeIntegrity <= 0.25, and detail the structural flaw(s).
4. Quote verbatim substrings of REVISED PASSAGE in remainingIssues.sourceText. Never fabricate external citations or numbers.
5. Write updatedTitleJa, repairSummary, uncertaintyNote, and remainingIssues diagnostic explanations (rationale, missingEvidence, suggestedRevision, uncertaintyNote) in clear, natural Japanese.

${params.connectedContext ? `Connected Graph Context: ${params.connectedContext}\n` : ''}
PRIOR VULNERABILITIES:
${issuesBlock}

ORIGINAL PASSAGE:
${params.originalText}

REVISED PASSAGE:
${params.revisedText}`;
}
