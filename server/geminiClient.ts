import { GoogleGenAI, type Schema } from '@google/genai';
import {
  BenchmarkGeminiResultSchema,
  ReviseNodeGeminiResult,
  ReviseNodeGeminiResultSchema,
  ValidatedGraphBundle,
  auditSingleRevisionGrounding,
  validateAndSanitizeThesisGraph,
} from '../src/engine/argumentValidator';
import { ACADEMIC_TEST_DATASET } from '../src/data/testCases';
import {
  DEFAULT_GEMINI_MODEL,
  GeminiBenchmarkActual,
  type GeminiModelId,
  SUPPORTED_GEMINI_MODELS,
  ToulminRole,
} from '../src/types/thesis';
import {
  BENCHMARK_EVAL_GEMINI_SCHEMA,
  REVISE_NODE_GEMINI_SCHEMA,
  THESIS_GRAPH_GEMINI_SCHEMA,
  TOULMIN_SYSTEM_INSTRUCTION,
  buildBenchmarkPrompt,
  buildManuscriptPrompt,
  buildNodeRevisionPrompt,
} from './toulminPrompt';

export type { GeminiModelId };

export interface StructuredGenerateParams {
  apiKey: string;
  model: GeminiModelId;
  prompt: string;
  schema: Schema;
  timeoutMs: number;
}

export type GenerateStructuredJsonFn = (params: StructuredGenerateParams) => Promise<string>;

export class GeminiConfigError extends Error {
  readonly code = 'GEMINI_API_KEY_NOT_CONFIGURED';
  readonly status = 503;
}

export class GeminiOutputValidationError extends Error {
  readonly code = 'GEMINI_SCHEMA_VALIDATION_FAILED';
  readonly status = 422;
}

export class GeminiUpstreamError extends Error {
  readonly code = 'GEMINI_UPSTREAM_FAILED';
  readonly status = 502;
}

function stripJsonCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function isTransientUpstreamFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('429') ||
    msg.includes('aborted')
  );
}

async function generateSingleAttempt({
  apiKey,
  model,
  prompt,
  schema,
  timeoutMs,
}: StructuredGenerateParams): Promise<string> {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      retryOptions: { attempts: 1 },
      timeout: timeoutMs,
    },
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: TOULMIN_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.15,
        abortSignal: controller.signal,
      },
    });
    const text = response.text;
    if (!text || !text.trim()) {
      throw new GeminiUpstreamError('Gemini returned an empty response payload.');
    }
    return text;
  } catch (err) {
    if (err instanceof GeminiUpstreamError) throw err;
    const msg = err instanceof Error ? err.message : 'Unknown Gemini API error';
    throw new GeminiUpstreamError(msg);
  } finally {
    clearTimeout(timer);
  }
}

export const defaultGenerateStructuredJson: GenerateStructuredJsonFn = async (params) => {
  return generateSingleAttempt(params);
};

async function callModelWithFallback(
  params: StructuredGenerateParams,
  generateFn: GenerateStructuredJsonFn,
): Promise<{ rawText: string; actualModel: GeminiModelId }> {
  if (generateFn !== defaultGenerateStructuredJson) {
    const rawText = await generateFn(params);
    return { rawText, actualModel: params.model };
  }

  const candidates = [
    params.model,
    ...SUPPORTED_GEMINI_MODELS.filter((m) => m !== params.model),
  ];

  let lastError: unknown;
  for (const candidateModel of candidates) {
    try {
      const rawText = await generateSingleAttempt({
        ...params,
        model: candidateModel,
      });
      return { rawText, actualModel: candidateModel };
    } catch (err) {
      lastError = err;
      if (!isTransientUpstreamFailure(err)) {
        throw err;
      }
    }
  }
  throw lastError;
}

export interface AnalyzeThesisResult {
  bundle: ValidatedGraphBundle;
  model: GeminiModelId;
  latencyMs: number;
  evaluatedAt: string;
}

export async function analyzeManuscriptWithGemini(
  input: {
    apiKey: string | null;
    manuscriptText: string;
    title?: string;
    domain?: string;
    model?: GeminiModelId;
  },
  generateFn: GenerateStructuredJsonFn = defaultGenerateStructuredJson,
): Promise<AnalyzeThesisResult> {
  if (!input.apiKey) {
    throw new GeminiConfigError(
      'GEMINI_API_KEY is not configured on the analysis server. Set GEMINI_API_KEY in your environment or supply a volatile session key in the Analysis modal.',
    );
  }

  const requestedModel: GeminiModelId = input.model ?? DEFAULT_GEMINI_MODEL;
  const prompt = buildManuscriptPrompt({
    manuscriptText: input.manuscriptText,
    title: input.title,
    domain: input.domain,
  });

  const startedAt = performance.now();
  const { rawText, actualModel } = await callModelWithFallback(
    {
      apiKey: input.apiKey,
      model: requestedModel,
      prompt,
      schema: THESIS_GRAPH_GEMINI_SCHEMA,
      timeoutMs: 14_000,
    },
    generateFn,
  );
  const latencyMs = Math.round(performance.now() - startedAt);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripJsonCodeFences(rawText));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON';
    throw new GeminiOutputValidationError(`Gemini output was not valid JSON: ${msg}`);
  }

  try {
    const bundle = validateAndSanitizeThesisGraph(parsedJson, input.manuscriptText);
    return {
      bundle,
      model: actualModel,
      latencyMs,
      evaluatedAt: new Date().toISOString(),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Schema mismatch';
    throw new GeminiOutputValidationError(`Gemini output failed ThesisGraphSchema check: ${msg}`);
  }
}

export async function runBenchmarksWithGemini(
  input: {
    apiKey: string | null;
    benchmarkIds?: string[];
    model?: GeminiModelId;
  },
  generateFn: GenerateStructuredJsonFn = defaultGenerateStructuredJson,
): Promise<{
  results: GeminiBenchmarkActual[];
  agreementCount: number;
  total: number;
  model: GeminiModelId;
  evaluatedAt: string;
}> {
  if (!input.apiKey) {
    throw new GeminiConfigError(
      'GEMINI_API_KEY is required to run Section E Academic Benchmarks against Gemini.',
    );
  }

  const requestedModel: GeminiModelId = input.model ?? DEFAULT_GEMINI_MODEL;
  const targets = input.benchmarkIds?.length
    ? ACADEMIC_TEST_DATASET.filter((tc) => input.benchmarkIds?.includes(tc.id))
    : ACADEMIC_TEST_DATASET;

  const results: GeminiBenchmarkActual[] = [];
  let lastActualModel: GeminiModelId = requestedModel;
  for (const tc of targets) {
    const startedAt = performance.now();
    const { rawText, actualModel } = await callModelWithFallback(
      {
        apiKey: input.apiKey,
        model: requestedModel,
        prompt: buildBenchmarkPrompt(tc.excerpt),
        schema: BENCHMARK_EVAL_GEMINI_SCHEMA,
        timeoutMs: 35_000,
      },
      generateFn,
    );
    lastActualModel = actualModel;
    const latencyMs = Math.round(performance.now() - startedAt);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(stripJsonCodeFences(rawText));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON';
      throw new GeminiOutputValidationError(
        `Benchmark ${tc.id} JSON parse error: ${msg}`,
      );
    }

    const validated = BenchmarkGeminiResultSchema.safeParse(parsedJson);
    if (!validated.success) {
      throw new GeminiOutputValidationError(
        `Benchmark ${tc.id} schema validation error: ${validated.error.message}`,
      );
    }

    const item = validated.data;
    results.push({
      benchmarkId: tc.id,
      ...item,
      categoryMatch: item.detectedIssueCategory === tc.expectedIssueCategory,
      severityMatch: item.detectedSeverity === tc.expectedSeverity,
      model: actualModel,
      latencyMs,
    });
  }

  const agreementCount = results.filter((r) => r.categoryMatch && r.severityMatch).length;
  return {
    results,
    agreementCount,
    total: results.length,
    model: lastActualModel,
    evaluatedAt: new Date().toISOString(),
  };
}

export async function reviseNodeWithGemini(
  input: {
    apiKey: string | null;
    nodeId: string;
    role: ToulminRole;
    originalText: string;
    revisedText: string;
    currentIssues: { issueCategory: string; severity: string; rationale: string }[];
    connectedContext?: string;
    model?: GeminiModelId;
  },
  generateFn: GenerateStructuredJsonFn = defaultGenerateStructuredJson,
): Promise<{
  evaluation: ReviseNodeGeminiResult;
  fabricationWarnings: string[];
  model: GeminiModelId;
  latencyMs: number;
  evaluatedAt: string;
}> {
  if (!input.apiKey) {
    throw new GeminiConfigError(
      'GEMINI_API_KEY is required to re-audit revised passages against Gemini.',
    );
  }

  const requestedModel: GeminiModelId = input.model ?? DEFAULT_GEMINI_MODEL;
  const prompt = buildNodeRevisionPrompt({
    nodeId: input.nodeId,
    role: input.role,
    originalText: input.originalText,
    revisedText: input.revisedText,
    priorIssues: input.currentIssues,
    connectedContext: input.connectedContext,
  });

  const startedAt = performance.now();
  const { rawText, actualModel } = await callModelWithFallback(
    {
      apiKey: input.apiKey,
      model: requestedModel,
      prompt,
      schema: REVISE_NODE_GEMINI_SCHEMA,
      timeoutMs: 40_000,
    },
    generateFn,
  );
  const latencyMs = Math.round(performance.now() - startedAt);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripJsonCodeFences(rawText));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON';
    throw new GeminiOutputValidationError(`Node revision output was not valid JSON: ${msg}`);
  }

  const validated = ReviseNodeGeminiResultSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new GeminiOutputValidationError(
      `Node revision output failed ReviseNodeGeminiResultSchema: ${validated.error.message}`,
    );
  }

  const fabricationWarnings = auditSingleRevisionGrounding(
    input.revisedText,
    input.nodeId,
    validated.data.remainingIssues,
  );

  return {
    evaluation: validated.data,
    fabricationWarnings,
    model: actualModel,
    latencyMs,
    evaluatedAt: new Date().toISOString(),
  };
}
