import { z } from 'zod';
import {
  AnalysisIssueSchema,
  DestructionTypeSchema,
  IssueCategorySchema,
  ThesisGraph,
  ThesisGraphSchema,
} from '../types/thesis';

export const ReviseNodeGeminiResultSchema = z.object({
  updatedTitle: z.string().min(1),
  updatedTitleJa: z.string().min(1),
  updatedStatus: z.enum(['healthy', 'warning', 'collapsed', 'unfinished']),
  updatedConfidence: z.number().min(0).max(1),
  repairedEdgeIntegrity: z.number().min(0).max(1),
  repairSummary: z.string().min(1),
  uncertaintyNote: z.string().min(1),
  remainingIssues: z.array(AnalysisIssueSchema),
});

export type ReviseNodeGeminiResult = z.infer<typeof ReviseNodeGeminiResultSchema>;

export const BenchmarkGeminiResultSchema = z.object({
  sourceText: z.string().min(1),
  detectedIssueCategory: z.union([IssueCategorySchema, z.literal('none')]),
  detectedSeverity: z.enum(['none', 'low', 'medium', 'critical']),
  rationale: z.string().min(1),
  missingEvidence: z.string().min(1),
  suggestedRevision: z.string().min(1),
  confidence: z.number().min(0).max(1),
  uncertaintyNote: z.string().min(1),
  destructionType: DestructionTypeSchema,
});

export type BenchmarkGeminiResult = z.infer<typeof BenchmarkGeminiResultSchema>;

export interface GroundingAuditReport {
  checked: boolean;
  verbatimMatchRate: number;
  matchedItems: number;
  totalItems: number;
  ungroundedItems: { id: string; excerpt: string }[];
  fabricationWarnings: string[];
}

export interface ValidatedGraphBundle {
  graph: ThesisGraph;
  repairedEdgesDropped: number;
  centralAssigned: boolean;
  groundingReport: GroundingAuditReport;
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\p{L}\p{N}\s.%+-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenOverlapRatio(excerpt: string, corpusNormalized: string): number {
  const norm = normalizeForMatch(excerpt);
  if (!norm) return 0;
  if (corpusNormalized.includes(norm)) return 1.0;

  const tokens = norm.split(' ').filter((t) => t.length >= 3);
  if (tokens.length === 0) return corpusNormalized.includes(norm) ? 1.0 : 0;

  // Handle CJK / spaceless text gracefully with sliding 4-character grams
  if (tokens.length <= 2) {
    const compactExcerpt = norm.replace(/\s+/g, '');
    const compactCorpus = corpusNormalized.replace(/\s+/g, '');
    if (compactCorpus.includes(compactExcerpt)) return 1.0;
    if (compactExcerpt.length >= 8) {
      const gramSize = 4;
      const totalGrams = compactExcerpt.length - gramSize + 1;
      let gramHits = 0;
      for (let i = 0; i < totalGrams; i += 1) {
        if (compactCorpus.includes(compactExcerpt.slice(i, i + gramSize))) {
          gramHits += 1;
        }
      }
      return gramHits / totalGrams;
    }
  }

  let hits = 0;
  for (const tok of tokens) {
    if (corpusNormalized.includes(tok)) hits += 1;
  }
  return hits / tokens.length;
}

function extractNumbersAndCitations(text: string): string[] {
  const tokens: string[] = [];
  const pctMatches = text.match(/\b\d+(?:\.\d+)?%/g) ?? [];
  const citeMatches = text.match(/\b(?:et al\.|doi:\S+|19\d{2}|20\d{2})\b/gi) ?? [];
  tokens.push(...pctMatches, ...citeMatches.map((m) => m.toLowerCase()));
  return [...new Set(tokens)];
}

function collectFabricationWarnings(
  originalLower: string,
  nodeId: string,
  issues: { id: string; suggestedRevision: string }[],
): string[] {
  const warnings: string[] = [];
  for (const issue of issues) {
    const markers = extractNumbersAndCitations(issue.suggestedRevision);
    for (const marker of markers) {
      if (!originalLower.includes(marker)) {
        warnings.push(
          `${nodeId}/${issue.id}: 改善案に含まれる「${marker}」は元の文章に見当たらないため、引用前に根拠を確認してください。`,
        );
      }
    }
  }
  return warnings;
}

export function auditSingleRevisionGrounding(
  revisedText: string,
  nodeId: string,
  issues: { id: string; suggestedRevision: string }[],
): string[] {
  return collectFabricationWarnings(revisedText.toLowerCase(), nodeId, issues);
}

/**
 * Verifies that AI-identified passages and revision suggestions remain anchored
 * to the submitted manuscript and do not introduce ungrounded numbers/citations.
 */
export function auditSourceGrounding(
  graph: ThesisGraph,
  originalText?: string,
): GroundingAuditReport {
  if (!originalText || originalText.trim().length === 0) {
    return {
      checked: false,
      verbatimMatchRate: 1,
      matchedItems: 0,
      totalItems: 0,
      ungroundedItems: [],
      fabricationWarnings: [],
    };
  }

  const normalizedCorpus = normalizeForMatch(originalText);
  const items: { id: string; excerpt: string }[] = [];

  for (const node of graph.nodes) {
    if (node.sourceText.trim().length > 0) {
      items.push({ id: node.id, excerpt: node.sourceText });
    }
    for (const issue of node.issues) {
      items.push({ id: `${node.id}/${issue.id}`, excerpt: issue.sourceText });
    }
  }

  let matchedItems = 0;
  const ungroundedItems: { id: string; excerpt: string }[] = [];
  for (const item of items) {
    const score = tokenOverlapRatio(item.excerpt, normalizedCorpus);
    if (score >= 0.65) {
      matchedItems += 1;
    } else {
      ungroundedItems.push(item);
    }
  }

  const fabricationWarnings: string[] = [];
  const originalLower = originalText.toLowerCase();
  for (const node of graph.nodes) {
    fabricationWarnings.push(...collectFabricationWarnings(originalLower, node.id, node.issues));
  }

  return {
    checked: true,
    verbatimMatchRate: items.length === 0 ? 1 : matchedItems / items.length,
    matchedItems,
    totalItems: items.length,
    ungroundedItems,
    fabricationWarnings,
  };
}

/**
 * Validates raw JSON (from Gemini API or imported file) against ThesisGraphSchema,
 * sanitizes cross-references so the 3D city mapper stays total, and checks source grounding.
 */
export function validateAndSanitizeThesisGraph(
  raw: unknown,
  originalText?: string,
): ValidatedGraphBundle {
  const preParsed = ThesisGraphSchema.parse(raw);

  // Deduplicate node IDs and guarantee one central spire claim
  const seenIds = new Set<string>();
  const cleanNodes = preParsed.nodes.filter((n) => {
    if (seenIds.has(n.id)) return false;
    seenIds.add(n.id);
    return true;
  });

  let centralAssigned = false;
  if (!cleanNodes.some((n) => n.isCentral)) {
    const firstClaim = cleanNodes.find((n) => n.role === 'claim') ?? cleanNodes[0];
    if (firstClaim) {
      firstClaim.isCentral = true;
      centralAssigned = true;
    }
  }

  const nodeIdSet = new Set(cleanNodes.map((n) => n.id));
  const cleanEdges = preParsed.edges.filter(
    (e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target) && e.source !== e.target,
  );
  const repairedEdgesDropped = preParsed.edges.length - cleanEdges.length;

  const graph: ThesisGraph = ThesisGraphSchema.parse({
    ...preParsed,
    nodes: cleanNodes,
    edges: cleanEdges,
  });

  const groundingReport = auditSourceGrounding(graph, originalText);

  return {
    graph,
    repairedEdgesDropped,
    centralAssigned,
    groundingReport,
  };
}
