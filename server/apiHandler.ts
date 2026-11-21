import { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import {
  DEFAULT_GEMINI_MODEL,
  SUPPORTED_GEMINI_MODELS,
  ToulminRoleSchema,
} from '../src/types/thesis';
import { resolveServerApiKey } from './envLoader';
import { extractTextFromDocxBuffer } from './docxExtractor';
import {
  GeminiConfigError,
  GeminiOutputValidationError,
  GeminiUpstreamError,
  GenerateStructuredJsonFn,
  analyzeManuscriptWithGemini,
  defaultGenerateStructuredJson,
  reviseNodeWithGemini,
  runBenchmarksWithGemini,
} from './geminiClient';

const MAX_BODY_BYTES = 262_144; // 256 KB hard payload ceiling
const MAX_UPLOAD_BODY_BYTES = 3_000_000; // ~2 MB raw docx base64 ceiling

const ExtractFileBodySchema = z.object({
  fileName: z.string().trim().min(1).max(260),
  contentBase64: z.string().min(4),
});

const AnalyzeBodySchema = z.object({
  manuscriptText: z
    .string()
    .trim()
    .min(40, '分析するには40文字以上の本文を入力してください。')
    .max(120_000, '一度に分析できる上限（120,000文字）を超えています。'),
  title: z.string().trim().max(300).optional(),
  domain: z.string().trim().max(180).optional(),
  model: z.enum(SUPPORTED_GEMINI_MODELS).optional(),
});

const BenchmarkBodySchema = z.object({
  benchmarkIds: z.array(z.string()).max(10).optional(),
  model: z.enum(SUPPORTED_GEMINI_MODELS).optional(),
});

const ReviseNodeBodySchema = z.object({
  nodeId: z.string().trim().min(1).max(64),
  role: ToulminRoleSchema,
  originalText: z.string().max(12_000),
  revisedText: z
    .string()
    .trim()
    .min(15, '再チェックするには15文字以上入力してください。')
    .max(12_000, '修正文は12,000文字以内で入力してください。'),
  currentIssues: z
    .array(
      z.object({
        issueCategory: z.string(),
        severity: z.string(),
        rationale: z.string(),
      }),
    )
    .max(20)
    .default([]),
  connectedContext: z.string().max(1500).optional(),
  model: z.enum(SUPPORTED_GEMINI_MODELS).optional(),
});

function readRequestApiKey(req: IncomingMessage): string | null {
  const headerKey =
    typeof req.headers['x-gemini-api-key'] === 'string'
      ? req.headers['x-gemini-api-key']
      : null;
  return resolveServerApiKey(headerKey);
}

class PayloadTooLargeError extends Error {}
class InvalidJsonBodyError extends Error {}

async function readJsonBody(req: IncomingMessage, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > maxBytes) {
      throw new PayloadTooLargeError(`送信データサイズが上限 (${maxBytes} バイト) を超えています。`);
    }
    chunks.push(buf);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new InvalidJsonBodyError('送信されたデータ形式が正しくありません。');
  }
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

export interface ApiHandlerOptions {
  generateFn?: GenerateStructuredJsonFn;
}

/**
 * Handles /api/health, /api/analyze, and /api/benchmarks routes.
 * Returns true if the request path matched /api/* and was handled.
 */
export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: ApiHandlerOptions = {},
): Promise<boolean> {
  const rawUrl = req.url ?? '/';
  const pathname = rawUrl.split('?')[0];
  if (!pathname.startsWith('/api/')) return false;

  const generateFn = options.generateFn ?? defaultGenerateStructuredJson;

  try {
    if (req.method === 'GET' && pathname === '/api/health') {
      const serverKeyPresent = Boolean(resolveServerApiKey(null));
      sendJson(res, 200, {
        ok: true,
        geminiConfigured: serverKeyPresent,
        defaultModel: DEFAULT_GEMINI_MODEL,
        supportedModels: [...SUPPORTED_GEMINI_MODELS],
        epistemicNotice:
          'Automated Toulmin analysis produces analytical hypotheses for scholarly review, never final academic rulings.',
      });
      return true;
    }

    if (req.method === 'POST' && pathname === '/api/analyze') {
      const rawBody = await readJsonBody(req);
      const parsed = AnalyzeBodySchema.safeParse(rawBody);
      if (!parsed.success) {
        sendJson(res, 400, {
          error: 'INVALID_REQUEST',
          message: parsed.error.issues.map((i) => i.message).join(' '),
        });
        return true;
      }

      const result = await analyzeManuscriptWithGemini(
        {
          apiKey: readRequestApiKey(req),
          manuscriptText: parsed.data.manuscriptText,
          title: parsed.data.title,
          domain: parsed.data.domain,
          model: parsed.data.model,
        },
        generateFn,
      );

      sendJson(res, 200, {
        graph: result.bundle.graph,
        repairedEdgesDropped: result.bundle.repairedEdgesDropped,
        centralAssigned: result.bundle.centralAssigned,
        groundingReport: result.bundle.groundingReport,
        model: result.model,
        latencyMs: result.latencyMs,
        evaluatedAt: result.evaluatedAt,
      });
      return true;
    }

    if (req.method === 'POST' && pathname === '/api/benchmarks') {
      const rawBody = await readJsonBody(req);
      const parsed = BenchmarkBodySchema.safeParse(rawBody);
      if (!parsed.success) {
        sendJson(res, 400, {
          error: 'INVALID_REQUEST',
          message: parsed.error.issues.map((i) => i.message).join(' '),
        });
        return true;
      }

      const report = await runBenchmarksWithGemini(
        {
          apiKey: readRequestApiKey(req),
          benchmarkIds: parsed.data.benchmarkIds,
          model: parsed.data.model,
        },
        generateFn,
      );

      sendJson(res, 200, report);
      return true;
    }

    if (req.method === 'POST' && pathname === '/api/extract-file') {
      const rawBody = await readJsonBody(req, MAX_UPLOAD_BODY_BYTES);
      const parsed = ExtractFileBodySchema.safeParse(rawBody);
      if (!parsed.success) {
        sendJson(res, 400, {
          error: 'INVALID_REQUEST',
          message: 'アップロードされたファイルの形式が正しくありません。',
        });
        return true;
      }

      const lower = parsed.data.fileName.toLowerCase();
      const buf = Buffer.from(parsed.data.contentBase64, 'base64');
      let text = '';
      if (lower.endsWith('.docx')) {
        text = extractTextFromDocxBuffer(buf);
      } else {
        text = buf.toString('utf8').trim();
      }

      if (text.length < 10) {
        sendJson(res, 422, {
          error: 'EMPTY_DOCUMENT',
          message: 'ファイルから十分な本文テキストを抽出できませんでした。',
        });
        return true;
      }

      sendJson(res, 200, {
        fileName: parsed.data.fileName,
        text: text.slice(0, 120_000),
        charCount: text.length,
      });
      return true;
    }

    if (req.method === 'POST' && pathname === '/api/revise-node') {
      const rawBody = await readJsonBody(req);
      const parsed = ReviseNodeBodySchema.safeParse(rawBody);
      if (!parsed.success) {
        sendJson(res, 400, {
          error: 'INVALID_REQUEST',
          message: parsed.error.issues.map((i) => i.message).join(' '),
        });
        return true;
      }

      const report = await reviseNodeWithGemini(
        {
          apiKey: readRequestApiKey(req),
          nodeId: parsed.data.nodeId,
          role: parsed.data.role,
          originalText: parsed.data.originalText,
          revisedText: parsed.data.revisedText,
          currentIssues: parsed.data.currentIssues,
          connectedContext: parsed.data.connectedContext,
          model: parsed.data.model,
        },
        generateFn,
      );

      sendJson(res, 200, report);
      return true;
    }

    sendJson(res, 404, { error: 'NOT_FOUND', message: `Unknown API route: ${pathname}` });
    return true;
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      sendJson(res, 413, { error: 'PAYLOAD_TOO_LARGE', message: err.message });
      return true;
    }
    if (err instanceof InvalidJsonBodyError) {
      sendJson(res, 400, { error: 'INVALID_JSON', message: err.message });
      return true;
    }
    if (err instanceof GeminiConfigError) {
      sendJson(res, err.status, {
        error: err.code,
        message: '接続キーが設定されていないため解析を実行できません。',
        setupInstructions:
          '詳細設定欄から接続キーを入力するか、環境設定ファイルにキーを設定してください。',
      });
      return true;
    }
    if (err instanceof GeminiOutputValidationError) {
      sendJson(res, err.status, {
        error: err.code,
        message: 'AIの出力形式を正しく読み取れませんでした。もう一度お試しください。',
      });
      return true;
    }
    if (err instanceof GeminiUpstreamError) {
      sendJson(res, err.status, {
        error: err.code,
        message: 'AIサーバーとの通信に失敗しました。しばらく待ってから再度お試しください。',
      });
      return true;
    }
    sendJson(res, 500, {
      error: 'INTERNAL_SERVER_ERROR',
      message: 'サーバー側で予期しないエラーが発生しました。',
    });
    return true;
  }
}
