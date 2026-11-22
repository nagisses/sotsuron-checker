import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
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

function createMinimalDocxBuffer(paragraphs) {
  const xmlBody = paragraphs
    .map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`)
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${xmlBody}</w:body></w:document>`;
  const fileNameBuf = Buffer.from('word/document.xml', 'utf8');
  const uncompressed = Buffer.from(xml, 'utf8');
  const compressed = zlib.deflateRawSync(uncompressed);

  const localHeader = Buffer.alloc(30 + fileNameBuf.length);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(8, 8);
  localHeader.writeUInt32LE(0, 14);
  localHeader.writeUInt32LE(compressed.length, 18);
  localHeader.writeUInt32LE(uncompressed.length, 22);
  localHeader.writeUInt16LE(fileNameBuf.length, 26);
  localHeader.writeUInt16LE(0, 28);
  fileNameBuf.copy(localHeader, 30);

  const cdOffset = localHeader.length + compressed.length;
  const centralDir = Buffer.alloc(46 + fileNameBuf.length);
  centralDir.writeUInt32LE(0x02014b50, 0);
  centralDir.writeUInt16LE(20, 4);
  centralDir.writeUInt16LE(20, 6);
  centralDir.writeUInt16LE(0, 8);
  centralDir.writeUInt16LE(8, 10);
  centralDir.writeUInt32LE(0, 16);
  centralDir.writeUInt32LE(compressed.length, 20);
  centralDir.writeUInt32LE(uncompressed.length, 24);
  centralDir.writeUInt16LE(fileNameBuf.length, 28);
  centralDir.writeUInt16LE(0, 30);
  centralDir.writeUInt16LE(0, 32);
  centralDir.writeUInt32LE(0, 42);
  fileNameBuf.copy(centralDir, 46);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(cdOffset, 16);

  return Buffer.concat([localHeader, compressed, centralDir, eocd]);
}

async function verifyDocxExtractEndpoint(handleApiRequest) {
  const docxBuf = createMinimalDocxBuffer([
    '卒業論文第1章：大学生の睡眠時間と集中力の調査データ。',
    '第2章：アンケート集計と矛盾の検証。',
  ]);
  const bodyText = JSON.stringify({
    fileName: 'sotsuron-sample.docx',
    contentBase64: docxBuf.toString('base64'),
  });
  const reqStream = Readable.from([Buffer.from(bodyText)]);
  reqStream.method = 'POST';
  reqStream.url = '/api/extract-file';
  reqStream.headers = { 'content-type': 'application/json' };

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
  await handleApiRequest(reqStream, mockRes);
  const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  assert.equal(statusCode, 200);
  assert.ok(json.text.includes('卒業論文第1章'));
  assert.ok(json.text.includes('第2章'));
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
    return {
      violations: axeRes.violations,
      passes: axeRes.passes.length,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

async function run() {
  const { loadLocalEnvFiles } = await import(path.join(PROJECT_ROOT, 'dist-server', 'envLoader.mjs'));
  loadLocalEnvFiles(PROJECT_ROOT);
  const { handleApiRequest } = await import(API_HANDLER_PATH);

  await verifyDocxExtractEndpoint(handleApiRequest);

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
    await page.waitForTimeout(1600);

    // STEP 1: Verify Pre-Writing Studio ('prep')
    const step0State = await page.evaluate(() => window.__THESIS_CITY__.getState());
    assert.equal(step0State.appPhase, 'prep', 'Must start on unified pre-writing studio');
    const step0Audit = await runAudit(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'compact-00-prep-studio.png') });

    // Load Preset ② (earthquake weakness), switch to Visual Map & Outline tab, and assemble draft into Step 2 ('upload')
    await page.getByRole('button', { name: /スマホ×睡眠/i }).click();
    await page.waitForTimeout(200);
    await page.getByRole('tab', { name: /3\. 論点マップ＆構成/i }).click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'compact-00b-visual-map.png') });
    await page.getByRole('button', { name: /この構成から本文ドラフトを作成して整合性＆3D耐震テストへ/i }).click();
    await page.waitForTimeout(350);

    // STEP 2: Verify Draft/Upload Stage ('upload') pre-filled from Prep Studio
    const step1State = await page.evaluate(() => window.__THESIS_CITY__.getState());
    assert.equal(step1State.appPhase, 'upload', 'Must advance to upload/draft stage');
    const step1Audit = await runAudit(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'compact-01-upload-empty-plot.png') });

    // Run 12-factor consistency check directly on the assembled draft!
    await page.getByRole('button', { name: /文章の矛盾・整合性をチェックする/i }).click();
    await page.waitForFunction(
      () => window.__THESIS_CITY__?.getState().appPhase === 'verify',
      undefined,
      { timeout: 15000 },
    );
    await page.waitForTimeout(1000);

    // STEP 2: Verify Interactive Contradiction & Consistency Check Stage ('verify')
    const step2State = await page.evaluate(() => window.__THESIS_CITY__.getState());
    assert.equal(step2State.appPhase, 'verify');
    assert.equal(step2State.scoreReport, null, 'Score must not be finalized before Step 3');

    // Click confirmation toggles & overall checkboxes
    await page.getByRole('button', { name: /確認済みにする/i }).first().click();
    const checkboxes = await page.locator('.overall-check-box input[type="checkbox"]').all();
    for (const cb of checkboxes) {
      await cb.check();
    }
    await page.waitForTimeout(400);
    const step2Audit = await runAudit(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'compact-02-verify-contradictions.png') });

    // STEP 3: Click "検証を完了して点数を出す（建物を建てる）→"
    await page.getByRole('button', { name: /検証を完了して点数を出す（建物を建てる）/i }).click();

    // Capture mid-construction rising buildings!
    await page.waitForTimeout(650);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'compact-03-building-rising.png') });

    // Wait for all buildings & bridges to finish rising
    await page.waitForTimeout(2400);
    const step3State = await page.evaluate(() => window.__THESIS_CITY__.getState());
    assert.equal(step3State.appPhase, 'built');
    assert.ok(step3State.scoreReport && step3State.scoreReport.totalScore > 0);
    const step3Audit = await runAudit(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'compact-04-built-diorama.png') });

    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      throw new Error(`Browser errors: ${JSON.stringify({ consoleErrors, pageErrors })}`);
    }
    if (
      step0Audit.violations.length > 0 ||
      step1Audit.violations.length > 0 ||
      step2Audit.violations.length > 0 ||
      step3Audit.violations.length > 0
    ) {
      throw new Error(
        `WCAG violations: ${JSON.stringify({
          step0: step0Audit.violations,
          step1: step1Audit.violations,
          step2: step2Audit.violations,
          step3: step3Audit.violations,
        })}`,
      );
    }

    console.log(
      JSON.stringify({
        status: 'PASS',
        docxExtraction: 'PASS',
        liveGeminiUsed: hasLiveKey,
        step1Phase: step1State.appPhase,
        step2Phase: step2State.appPhase,
        step3Phase: step3State.appPhase,
        finalScore: step3State.scoreReport.totalScore,
        finalRank: step3State.scoreReport.rank,
        buildingCount: step3State.buildingCount,
        fps: step3State.telemetry.fps,
        wcagViolations: 0,
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
