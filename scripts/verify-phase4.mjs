import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
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

const IMPORTED_SALT_MARSH_THESIS = {
  id: 'thesis-coastal-salt-marsh-2026',
  title: 'Blue Carbon Burial Stability in Restored Temperate Salt Marshes',
  titleJa: '回復温帯塩性湿地におけるブルーカーボン埋積安定性の論証解析',
  domain: 'Coastal Biogeochemistry',
  abstract:
    'Compares sediment core accretion rates against idealized sea-level attenuation claims across eight Atlantic marsh sites.',
  nodes: [
    {
      id: 'THS-00',
      code: 'THS-00 // CORE',
      title: 'Tidal Marsh Accretion Offsets Moderate Sea-Level Rise',
      titleJa: '中程度の海面上昇を相殺する潮汐湿地堆積主張',
      role: 'claim',
      isCentral: true,
      sourceText: 'Mineral-organic accretion rates in restored Spartina marshes match 4.1 mm/yr mean sea-level rise.',
      sourceLocation: 'Abstract, Line 2',
      confidence: 0.87,
      status: 'healthy',
      issues: [],
    },
    {
      id: 'THS-01',
      code: 'THS-01',
      title: 'Centennial Sediment Carbon Permanence',
      titleJa: '百年スケールの底質炭素固定持続性',
      role: 'claim',
      isCentral: false,
      sourceText: 'Buried root biomass remains anoxic below 25 cm depth for over 100 years.',
      sourceLocation: 'Section 3.2',
      confidence: 0.83,
      status: 'healthy',
      issues: [],
    },
    {
      id: 'THS-02',
      code: 'THS-02 // FAULT',
      title: 'Universal 50-Year Storm Surge Elimination Claim',
      titleJa: '高潮被害完全抑止の過度な一般化主張',
      role: 'claim',
      isCentral: false,
      sourceText: 'Marsh fringes eliminate extreme hurricane wave setup along all urbanized estuaries.',
      sourceLocation: 'Section 4.1',
      confidence: 0.28,
      status: 'collapsed',
      issues: [
        {
          id: 'ISS-M1',
          sourceText: 'Marsh fringes eliminate extreme hurricane wave setup along all urbanized estuaries.',
          issueCategory: 'overgeneralization',
          severity: 'critical',
          rationale: 'Extrapolates minor swell damping to Category 4 storm surges across all bathymetric profiles.',
          missingEvidence: 'Coupled ADCIRC-SWAN hydrodynamic validation across bulkheaded harbors.',
          suggestedRevision: 'Narrow claim to wind-wave attenuation during sub-2m storm surge events.',
          confidence: 0.91,
          uncertaintyNote: 'Requires bathymetric friction modeling for deep-channel harbors.',
          destructionType: 'structural_collapse',
        },
      ],
    },
    {
      id: 'EVD-M1',
      code: 'EVD-M1',
      title: 'Pb-210 Radiometric Core Chronology (48 Cores)',
      titleJa: 'Pb-210 放射年代コア測定データ（48本）',
      role: 'grounds',
      isCentral: false,
      sourceText: '48 vibracore profiles dated via Pb-210 and Cs-137 markers confirm 4.1 ± 0.5 mm/yr accretion.',
      sourceLocation: 'Section 2.3',
      confidence: 0.93,
      status: 'healthy',
      issues: [],
    },
    {
      id: 'EVD-M2',
      code: 'EVD-M2 // GAP',
      title: 'Missing Storm Edge Erosion Telemetry',
      titleJa: '暴風時エッジ浸食実測データの欠落',
      role: 'grounds',
      isCentral: false,
      sourceText: 'Long-term lateral scarp retreat after extreme winter nor’easters was not instrumented.',
      sourceLocation: 'Section 4.3',
      confidence: 0.34,
      status: 'unfinished',
      issues: [
        {
          id: 'ISS-M2',
          sourceText: 'Long-term lateral scarp retreat after extreme winter nor’easters was not instrumented.',
          issueCategory: 'insufficient_grounds',
          severity: 'critical',
          rationale: 'Lateral cliff collapse can export sequestered peat faster than vertical burial.',
          missingEvidence: 'Annual terrestrial LiDAR scarp retreat surveys across storm seasons.',
          suggestedRevision: 'Quantify net horizontal carbon budget prior to certifying sink status.',
          confidence: 0.88,
          uncertaintyNote: 'Uncertainty stems from omitted storm-event erosion surveys.',
          destructionType: 'structural_collapse',
        },
      ],
    },
    {
      id: 'WRT-M1',
      code: 'WRT-M1',
      title: 'Mineral Flocculation Feedback Equation',
      titleJa: '懸濁粒子捕捉フィードバック理論',
      role: 'warrant',
      isCentral: false,
      sourceText: 'Dense Spartina stem friction slows ebb velocity, depositing suspended clay around root mats.',
      sourceLocation: 'Section 1.4',
      confidence: 0.85,
      status: 'healthy',
      issues: [],
    },
    {
      id: 'RBT-M1',
      code: 'RBT-M1',
      title: 'Subsidence & Upstream Dam Trapping',
      titleJa: '地盤沈下と上流ダムによる土砂供給遮断への反論考慮',
      role: 'rebuttal',
      isCentral: false,
      sourceText: 'Estuaries fed by heavily dammed watersheds may starve of mineral sediment.',
      sourceLocation: 'Section 4.4',
      confidence: 0.72,
      status: 'warning',
      issues: [],
    },
    {
      id: 'BCK-M1',
      code: 'BCK-M1',
      title: 'NOAA Estuarine Tide Gauge Baseline',
      titleJa: 'NOAA 検潮所基準データ基盤',
      role: 'backing',
      isCentral: false,
      sourceText: 'Sea-level trend calibrated against 50-year NOAA tide-gauge records.',
      sourceLocation: 'Section 2.1',
      confidence: 0.9,
      status: 'healthy',
      issues: [],
    },
  ],
  edges: [
    { id: 'ME-1', source: 'EVD-M1', target: 'WRT-M1', relationshipType: 'supports', explanation: '48 sediment cores feed mineral trapping model.', integrity: 0.92 },
    { id: 'ME-2', source: 'BCK-M1', target: 'WRT-M1', relationshipType: 'backs', explanation: 'NOAA gauge baseline calibrates accretion vs RSLR.', integrity: 0.89 },
    { id: 'ME-3', source: 'WRT-M1', target: 'THS-00', relationshipType: 'warrants', explanation: 'Flocculation dynamics justify vertical offset claim.', integrity: 0.86 },
    { id: 'ME-4', source: 'THS-01', target: 'THS-00', relationshipType: 'supports', explanation: 'Centennial burial supports net carbon storage thesis.', integrity: 0.84 },
    { id: 'ME-5', source: 'EVD-M2', target: 'THS-02', relationshipType: 'missing_link', explanation: 'Missing storm erosion data severs extreme surge claim.', integrity: 0.18 },
    { id: 'ME-6', source: 'THS-02', target: 'THS-00', relationshipType: 'contradicts', explanation: 'Unbounded storm claims overreach calibrated equilibrium.', integrity: 0.31 },
    { id: 'ME-7', source: 'RBT-M1', target: 'THS-00', relationshipType: 'rebuts', explanation: 'Upstream sediment starvation limits validity scope.', integrity: 0.74 },
  ],
};

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
    await page.addInitScript(() => {
      window.__CWV__ = { lcp: null, cls: 0 };
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__CWV__.lcp = Math.round(entry.startTime);
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__CWV__.cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    let expectNegative503 = false;
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const txt = msg.text();
        if (expectNegative503 && txt.includes('503')) return;
        consoleErrors.push(txt);
      }
    });
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__THESIS_CITY__?.getState().sceneReady === true, undefined, {
      timeout: 15000,
    });
    await page.waitForTimeout(2200);
    const baseline = await page.evaluate(() => ({
      city: window.__THESIS_CITY__.getState(),
      cwv: window.__CWV__,
    }));

    // 1. Open Thesis Ingestion Modal
    await page.getByRole('button', { name: /論文を読み込む/i }).click();
    await page.waitForSelector('#analysis-modal-title');
    await page.getByRole('button', { name: /サンプル入力（問題あり）/i }).click();
    await page.waitForTimeout(400);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase4-01-analysis-modal.png') });
    const modalAudit = await runAudit(page);

    // 2. Test JSON Claim Graph Ingestion -> Live 3D City Rebuild
    await page.fill('#manuscript-textarea', JSON.stringify(IMPORTED_SALT_MARSH_THESIS, null, 2));
    await page.waitForSelector('button:has-text("構造データをそのまま読み込む")');
    await page.getByRole('button', { name: '構造データをそのまま読み込む' }).click();
    await page.waitForFunction(
      () => window.__THESIS_CITY__?.getState().thesisId === 'thesis-coastal-salt-marsh-2026',
      undefined,
      { timeout: 10000 },
    );
    await page.waitForTimeout(2400);
    const rebuiltState = await page.evaluate(() => window.__THESIS_CITY__.getState());
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase4-02-dynamic-city-rebuilt.png') });

    // 3. Re-open modal & test collapsible Developer Benchmark Runner + UI audit
    await page.getByRole('button', { name: /論文を読み込む/i }).click();
    await page.waitForSelector('#analysis-modal-title');
    await page.locator('.advanced-summary').click();
    await page.waitForTimeout(300);
    let benchmarkAlertText = null;
    let liveBenchmarkAgreement = null;
    let liveGeminiCityState = null;

    if (!hasLiveKey) {
      expectNegative503 = true;
      await page.getByRole('button', { name: /診断テストを実行/i }).click();
      await page.waitForSelector('[role="alert"]');
      benchmarkAlertText = await page.locator('[role="alert"]').textContent();
      expectNegative503 = false;
    } else {
      await page.getByRole('button', { name: /診断テストを実行/i }).click();
      await page.waitForFunction(
        () => document.body.innerText.includes('一致:'),
        undefined,
        { timeout: 120000 },
      );
      liveBenchmarkAgreement = await page
        .locator('.benchmark-runner-bar')
        .textContent();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase4-05-live-benchmarks-actual.png') });
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase4-03-benchmarks-tab.png') });
    const benchAudit = await runAudit(page);

    if (hasLiveKey) {
      // Also verify live Japanese Manuscript -> Gemini -> 3D City flow in UI
      await page.getByRole('button', { name: /サンプル入力（問題あり）/i }).click();
      await page.getByRole('button', { name: /文章を分析して立体表示/i }).click();
      await page.waitForFunction(
        () => window.__THESIS_CITY__?.getState().analysisSource === 'gemini',
        undefined,
        { timeout: 60000 },
      );
      await page.waitForTimeout(2200);
      liveGeminiCityState = await page.evaluate(() => window.__THESIS_CITY__.getState());
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase4-04-live-gemini-city.png') });
    } else {
      await page.keyboard.press('Escape');
    }

    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      throw new Error(`Browser errors detected: ${JSON.stringify({ consoleErrors, pageErrors })}`);
    }
    if (modalAudit.violations.length > 0 || benchAudit.violations.length > 0) {
      throw new Error(`WCAG violations detected: ${JSON.stringify({ modalAudit, benchAudit })}`);
    }

    console.log(
      JSON.stringify({
        status: 'PASS',
        liveGeminiKeyConfigured: hasLiveKey,
        baseline,
        rebuiltState,
        benchmarkAlertText,
        liveBenchmarkAgreement,
        liveGeminiCityState,
        modalAudit: {
          violations: modalAudit.violations.length,
          passes: modalAudit.passes,
          buttonCount: modalAudit.buttonCount,
          smallTargets: modalAudit.smallTargets,
          horizontalOverflow: modalAudit.horizontalOverflow,
        },
        benchAudit: {
          violations: benchAudit.violations.length,
          passes: benchAudit.passes,
          buttonCount: benchAudit.buttonCount,
          smallTargets: benchAudit.smallTargets,
          horizontalOverflow: benchAudit.horizontalOverflow,
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
