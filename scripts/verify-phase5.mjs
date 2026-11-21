import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const API_HANDLER_PATH = path.join(PROJECT_ROOT, 'dist-server', 'apiHandler.mjs');
const SCREENSHOT_DIR =
  process.env.ARTIFACT_DIR ||
  '/Users/ponchanponchannn/.gemini/antigravity/brain/633523de-39aa-46c4-8b94-792de61b7075';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};

async function runReviseApiContracts(handleApiRequest) {
  const invoke = async ({ url, bodyText, headers = {}, generateFn }) => {
    const reqStream = Readable.from([Buffer.from(bodyText)]);
    reqStream.method = 'POST';
    reqStream.url = url;
    reqStream.headers = headers;
    let statusCode = 200;
    const chunks = [];
    const mockRes = {
      writeHead(code) {
        statusCode = code;
      },
      end(c) {
        if (c) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(String(c)));
      },
    };
    await handleApiRequest(reqStream, mockRes, { generateFn });
    return {
      statusCode,
      json: JSON.parse(Buffer.concat(chunks).toString('utf8')),
    };
  };

  const prevKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const noKeyRes = await invoke({
    url: '/api/revise-node',
    bodyText: JSON.stringify({
      nodeId: 'CLM-03',
      role: 'claim',
      originalText: 'Old sentence.',
      revisedText: 'Revised sufficiently long qualified claim sentence.',
      currentIssues: [],
    }),
  });
  assert.equal(noKeyRes.statusCode, 503);

  const shortRes = await invoke({
    url: '/api/revise-node',
    headers: { 'x-gemini-api-key': 'dummy' },
    bodyText: JSON.stringify({
      nodeId: 'CLM-03',
      role: 'claim',
      originalText: 'Old sentence.',
      revisedText: 'Too short',
      currentIssues: [],
    }),
  });
  assert.equal(shortRes.statusCode, 400);

  const okRes = await invoke({
    url: '/api/revise-node',
    headers: { 'x-gemini-api-key': 'dummy' },
    bodyText: JSON.stringify({
      nodeId: 'CLM-03',
      role: 'claim',
      originalText: 'Old sentence.',
      revisedText:
        'Resurfacing District 7 boulevards coincided with reduced admissions, pending multivariate controls.',
      currentIssues: [],
    }),
    generateFn: async () =>
      JSON.stringify({
        updatedTitle: 'Calibrated Association Hypothesis for District 7 Morbidity',
        updatedTitleJa: '第7地区救急搬送減少に関する統計的関連仮説（交絡統制留保）',
        updatedStatus: 'healthy',
        updatedConfidence: 0.89,
        repairedEdgeIntegrity: 0.88,
        repairSummary: 'Qualified temporal association cleanly and removed causal leap.',
        uncertaintyNote: 'Contract verification hypothesis pending full dataset.',
        remainingIssues: [],
      }),
  });
  assert.equal(okRes.statusCode, 200);
  assert.equal(okRes.json.evaluation.updatedStatus, 'healthy');

  if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
}

function startAppAndApiServer(handleApiRequest) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (await handleApiRequest(req, res)) return;
      const reqPath = (req.url || '/').split('?')[0];
      const safeRel = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '');
      let filePath = path.join(DIST_DIR, safeRel);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function findBrowserExecutable() {
  const candidates = [
    '/Users/ponchanponchannn/Library/Caches/ms-playwright/chromium-1254/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    '/Users/ponchanponchannn/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell',
  ];
  return candidates.find((p) => fs.existsSync(p));
}

async function runAudit(page) {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    const axeRes = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    });
    const buttons = [...document.querySelectorAll('button')];
    const smallTargets = [];
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 24 || rect.height < 24)) {
        smallTargets.push({
          text: (btn.textContent || btn.getAttribute('aria-label') || '').trim(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    }
    return {
      violations: axeRes.violations,
      passes: axeRes.passes.length,
      buttonCount: buttons.length,
      smallTargets,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

async function run() {
  const { loadLocalEnvFiles } = await import(path.join(PROJECT_ROOT, 'dist-server', 'envLoader.mjs'));
  loadLocalEnvFiles(PROJECT_ROOT);
  const { handleApiRequest } = await import(API_HANDLER_PATH);

  // Run fast contract verification in-process before launching browser
  await runReviseApiContracts(handleApiRequest);

  const hasLiveKey = Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim());
  const { server, port } = await startAppAndApiServer(handleApiRequest);
  const baseUrl = `http://127.0.0.1:${port}/`;
  const executablePath = findBrowserExecutable();
  if (!executablePath) throw new Error('No Chromium executable found.');

  const useMetalGpu = executablePath.includes('Google Chrome for Testing');
  const consoleErrors = [];
  const pageErrors = [];
  let browser;

  try {
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: useMetalGpu
        ? [
            '--headless=new',
            '--no-sandbox',
            '--enable-webgl',
            '--use-gl=angle',
            '--use-angle=metal',
            '--ignore-gpu-blocklist',
          ]
        : ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__THESIS_CITY__?.getState().sceneReady === true, undefined, {
      timeout: 15000,
    });
    await page.waitForTimeout(2000);
    const initial = await page.evaluate(() => window.__THESIS_CITY__.getState());

    // 1. Focus collapsed node CLM-03 and open inline Passage Editor
    await page.evaluate(() => window.__THESIS_CITY__.focusBuilding('CLM-03'));
    await page.waitForTimeout(1600);
    await page.getByRole('button', { name: /文章を直して再チェック/i }).click();
    await page.waitForSelector('#node-revision-textarea');
    const editorAudit = await runAudit(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase5-01-revision-editor.png') });

    // 2. Repair CLM-03 via Live Gemini (or contract check if key absent)
    const soundRevisionText =
      '第7地区の大通りにおける舗装改修と同期間に熱中症救急搬送の減少が見られたものの、涼み処の拡充、季節別暑さ指数、および2023〜2025年で統一された救急管轄境界を統制した縦断的回帰分析を行わなければ、舗装単体の直接的因果効果は断定できない。';

    await page.fill('#node-revision-textarea', soundRevisionText);
    if (hasLiveKey) {
      await page.getByRole('button', { name: /再診断して建物を更新/i }).click();
      await page.waitForFunction(
        () => window.__THESIS_CITY__?.getState().revisionCount === 1,
        undefined,
        { timeout: 60000 },
      );
    } else {
      await page.evaluate((text) => {
        window.__THESIS_CITY__.applyNodeRevision({
          nodeId: 'CLM-03',
          revisedText: text,
          evaluation: {
            updatedTitle: '第7地区舗装改修と熱中症搬送減少の相関仮説（交絡統制留保）',
            updatedTitleJa: '第7地区舗装改修と熱中症搬送減少の相関仮説（交絡統制留保）',
            updatedStatus: 'healthy',
            updatedConfidence: 0.89,
            repairedEdgeIntegrity: 0.88,
            repairSummary: '因果の断定を避け、暑さ指数や管轄統一などの統制条件を適切に限定しました。',
            uncertaintyNote: '追加の縦断データ解析によって最終確定される分析仮説です。',
            remainingIssues: [],
          },
        });
      }, soundRevisionText);
    }

    // Capture mid-reconstruction beam & concentric assembly rings!
    await page.waitForTimeout(1150);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase5-02-reconstructed-city-mid.png') });

    // Wait for beam settle & camera framing lock
    await page.waitForTimeout(2600);
    const afterRepair = await page.evaluate(() => window.__THESIS_CITY__.getState());
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase5-03-reconstructed-settled.png') });

    assert.ok(
      afterRepair.integrityScore > initial.integrityScore,
      `Expected integrity to climb after repairing CLM-03 (${initial.integrityScore} -> ${afterRepair.integrityScore})`,
    );

    // 3. Demonstrate Destruction Loop: degrade CLM-01 with flawed overgeneralization
    await page.evaluate(() => window.__THESIS_CITY__.focusBuilding('CLM-01'));
    await page.waitForTimeout(1400);
    await page.getByRole('button', { name: /文章を直して再チェック/i }).click();
    await page.waitForSelector('#node-revision-textarea');
    const flawedText =
      '都心の裏通り1本に塗装しただけで、全世界の都市温暖化がメンテナンス不要で永久に完全解消することが証明された。';
    await page.fill('#node-revision-textarea', flawedText);

    if (hasLiveKey) {
      await page.getByRole('button', { name: /再診断して建物を更新/i }).click();
      await page.waitForFunction(
        () => window.__THESIS_CITY__?.getState().revisionCount === 2,
        undefined,
        { timeout: 60000 },
      );
    } else {
      await page.evaluate((text) => {
        window.__THESIS_CITY__.applyNodeRevision({
          nodeId: 'CLM-01',
          revisedText: text,
          evaluation: {
            updatedTitle: '根拠欠落を伴う過度な一般化主張',
            updatedTitleJa: '根拠欠落を伴う過度な一般化主張',
            updatedStatus: 'collapsed',
            updatedConfidence: 0.22,
            repairedEdgeIntegrity: 0.2,
            repairSummary: '単一路地の観察から世界規模の永久解消を断定しており、過度な一般化です。',
            uncertaintyNote: '複数地区での長期実測データによる検証が必要です。',
            remainingIssues: [
              {
                id: 'ISS-R1',
                sourceText: text,
                issueCategory: 'overgeneralization',
                severity: 'critical',
                rationale: '単一区間の事例のみで世界規模かつ永久の効果を証明することはできません。',
                missingEvidence: '複数都市での長期気温比較データ。',
                suggestedRevision: '観測対象区間と気象条件の範囲に限定して記述する。',
                confidence: 0.94,
                uncertaintyNote: '標本範囲を超えた過度な一般化として検出されました。',
                destructionType: 'structural_collapse',
              },
            ],
          },
        });
      }, flawedText);
    }

    await page.waitForTimeout(1600);
    const afterCollapse = await page.evaluate(() => window.__THESIS_CITY__.getState());
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase5-04-collapse-triggered.png') });

    // 4. Test UNDO restores prior reconstructed state cleanly
    await page.getByRole('button', { name: /元に戻す/i }).first().click();
    await page.waitForTimeout(1200);
    const afterUndo = await page.evaluate(() => window.__THESIS_CITY__.getState());
    assert.equal(afterUndo.revisionCount, 1);
    assert.equal(afterUndo.integrityScore, afterRepair.integrityScore);

    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      throw new Error(`Browser errors detected: ${JSON.stringify({ consoleErrors, pageErrors })}`);
    }
    if (editorAudit.violations.length > 0) {
      throw new Error(`WCAG violations detected: ${JSON.stringify(editorAudit.violations)}`);
    }

    console.log(
      JSON.stringify({
        status: 'PASS',
        liveGeminiExecuted: hasLiveKey,
        initial,
        afterRepair,
        afterCollapse,
        afterUndo,
        editorAudit: {
          violations: editorAudit.violations.length,
          passes: editorAudit.passes,
          buttonCount: editorAudit.buttonCount,
          smallTargets: editorAudit.smallTargets,
          horizontalOverflow: editorAudit.horizontalOverflow,
        },
        consoleErrors,
        pageErrors,
      }),
    );
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
