import { GroundingAuditReport, ReviseNodeGeminiResult } from './argumentValidator';
import {
  DEFAULT_GEMINI_MODEL,
  GeminiBenchmarkActual,
  GeminiModelId,
  ThesisGraph,
  ToulminRole,
} from '../types/thesis';

export interface ReviseNodeApiResponse {
  evaluation: ReviseNodeGeminiResult;
  fabricationWarnings: string[];
  model: string;
  latencyMs: number;
  evaluatedAt: string;
}

export interface ApiHealthResponse {
  ok: boolean;
  geminiConfigured: boolean;
  defaultModel: string;
  supportedModels: string[];
  epistemicNotice: string;
}

export interface AnalyzeApiResponse {
  graph: ThesisGraph;
  repairedEdgesDropped: number;
  centralAssigned: boolean;
  groundingReport: GroundingAuditReport;
  model: string;
  latencyMs: number;
  evaluatedAt: string;
}

export interface BenchmarkApiResponse {
  results: GeminiBenchmarkActual[];
  agreementCount: number;
  total: number;
  model: string;
  evaluatedAt: string;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function parseErrorOrThrow(res: Response): Promise<never> {
  let code = `HTTP_${res.status}`;
  let message = `通信エラーが発生しました (${res.status})`;
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    if (data.error) code = data.error;
    if (data.message) message = data.message;
  } catch {
    // Non-JSON upstream error
  }
  throw new ApiClientError(message, code, res.status);
}

export async function fetchApiHealth(): Promise<ApiHealthResponse> {
  const res = await fetch('/api/health', { method: 'GET' });
  if (!res.ok) await parseErrorOrThrow(res);
  return (await res.json()) as ApiHealthResponse;
}

async function postApiJson<T>(url: string, body: unknown, sessionApiKey?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (sessionApiKey?.trim()) {
    headers['X-Gemini-Api-Key'] = sessionApiKey.trim();
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseErrorOrThrow(res);
  return (await res.json()) as T;
}

export interface ExtractFileResponse {
  fileName: string;
  text: string;
  charCount: number;
}

export async function extractUploadedDocument(file: File): Promise<ExtractFileResponse> {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith('.docx')) {
    const text = (await file.text()).trim();
    return {
      fileName: file.name,
      text: text.slice(0, 120_000),
      charCount: text.length,
    };
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const contentBase64 = btoa(binary);

  return postApiJson<ExtractFileResponse>('/api/extract-file', {
    fileName: file.name,
    contentBase64,
  });
}

export async function analyzeThesisManuscript(params: {
  manuscriptText: string;
  title?: string;
  domain?: string;
  model?: GeminiModelId;
  sessionApiKey?: string;
}): Promise<AnalyzeApiResponse> {
  return postApiJson<AnalyzeApiResponse>(
    '/api/analyze',
    {
      manuscriptText: params.manuscriptText,
      title: params.title,
      domain: params.domain,
      model: params.model ?? DEFAULT_GEMINI_MODEL,
    },
    params.sessionApiKey,
  );
}

export async function runLiveBenchmarks(params: {
  benchmarkIds?: string[];
  model?: GeminiModelId;
  sessionApiKey?: string;
}): Promise<BenchmarkApiResponse> {
  return postApiJson<BenchmarkApiResponse>(
    '/api/benchmarks',
    {
      benchmarkIds: params.benchmarkIds,
      model: params.model ?? DEFAULT_GEMINI_MODEL,
    },
    params.sessionApiKey,
  );
}

export async function reviseThesisNode(params: {
  nodeId: string;
  role: ToulminRole;
  originalText: string;
  revisedText: string;
  currentIssues: { issueCategory: string; severity: string; rationale: string }[];
  connectedContext?: string;
  model?: GeminiModelId;
  sessionApiKey?: string;
}): Promise<ReviseNodeApiResponse> {
  return postApiJson<ReviseNodeApiResponse>(
    '/api/revise-node',
    {
      nodeId: params.nodeId,
      role: params.role,
      originalText: params.originalText,
      revisedText: params.revisedText,
      currentIssues: params.currentIssues,
      connectedContext: params.connectedContext,
      model: params.model ?? DEFAULT_GEMINI_MODEL,
    },
    params.sessionApiKey,
  );
}
