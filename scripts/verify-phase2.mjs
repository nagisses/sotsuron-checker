import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const axeSourcePath = require.resolve('axe-core/axe.min.js');
const axeSource = fs.readFileSync(axeSourcePath, 'utf8');

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
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

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
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
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

function findBrowserExecutable() {
  const candidates = [
    '/Users/ponchanponchannn/Library/Caches/ms-playwright/chromium-1254/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    '/Users/ponchanponchannn/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  return candidates.find((p) => fs.existsSync(p));
}

async function run() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error('dist/ not found. Run npm run build first.');
  }

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const { server, port } = await startStaticServer();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const executablePath = findBrowserExecutable();
  if (!executablePath) {
    throw new Error('No Chromium executable found.');
  }

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
        : [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--enable-webgl',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
            '--ignore-gpu-blocklist',
          ],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Instrument CWV observers before first navigation
    await page.addInitScript(() => {
      window.__CWV__ = { lcp: null, cls: 0 };
      try {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) window.__CWV__.lcp = Math.round(last.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__CWV__.cls += entry.value;
            }
          }
        }).observe({ type: 'layout-shift', buffered: true });
      } catch {
        // Observer fallback if unsupported
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    const navStart = Date.now();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 15000 });

    // Wait for initial 1.8s Genesis camera animation + telemetry stabilization
    await page.waitForTimeout(3000);
    const loadElapsedMs = Date.now() - navStart;

    const overviewState = await page.evaluate(() => ({
      city: window.__THESIS_CITY__?.getState(),
      cwv: window.__CWV__,
      perfNav: performance.getEntriesByType('navigation')[0]
        ? {
            domInteractive: Math.round(performance.getEntriesByType('navigation')[0].domInteractive),
            loadEventEnd: Math.round(performance.getEntriesByType('navigation')[0].loadEventEnd),
          }
        : null,
      webglRenderer: (() => {
        const c = document.querySelector('canvas');
        const gl = c?.getContext('webgl2') || c?.getContext('webgl');
        return gl ? gl.getParameter(gl.RENDERER) : 'unknown';
      })(),
    }));

    // Screenshot 1: City Overview (with Inspector Open)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'phase2-01-overview.png'),
    });

    // Screenshot 2: City Overview Clean (Inspector Collapsed via keyboard 'i')
    await page.keyboard.press('i');
    await page.waitForTimeout(700);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'phase2-04-overview-clean.png'),
    });
    // Restore Inspector
    await page.keyboard.press('i');
    await page.waitForTimeout(600);

    // Screenshot 3: Central Tower Close-up (keyboard '2')
    await page.keyboard.press('2');
    await page.waitForTimeout(2100);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'phase2-02-central-tower.png'),
    });
    const centralState = await page.evaluate(() => window.__THESIS_CITY__?.getState());

    // Screenshot 4: Building Collapse Close-up (keyboard '3')
    await page.keyboard.press('3');
    await page.waitForTimeout(2100);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'phase2-03-collapse-closeup.png'),
    });
    const collapseState = await page.evaluate(() => window.__THESIS_CITY__?.getState());

    // Test interactive camera orbit drag & INP latency check
    const inpStart = Date.now();
    await page.keyboard.press('4');
    await page.waitForTimeout(200);
    const orbitLatencyMs = Date.now() - inpStart;

    // Test simple filter toggle inside RightPanel
    await page.getByRole('button', { name: /問題あり/i }).click();
    await page.waitForTimeout(250);
    const benchmarkVisibleCount = await page.locator('.node-list-box .node-list-row').count();
    await page.getByRole('button', { name: /すべて/i }).click();
    await page.waitForTimeout(250);

    // Screenshot 5: 2D Accessible Logic Graph modal (keyboard 'g')
    await page.keyboard.press('g');
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'phase2-05-a11y-2d-graph.png'),
    });

    // Run Axe WCAG 2.2 AA audit on modal open and on main HUD
    await page.evaluate(axeSource);
    const axeModalResults = await page.evaluate(async () => {
      return window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      });
    });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('1');
    await page.waitForTimeout(1500);

    const axeMainResults = await page.evaluate(async () => {
      return window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      });
    });

    // Target size & keyboard focus visibility audit
    const uiAudit = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const smallTargets = buttons
        .map((b) => {
          const r = b.getBoundingClientRect();
          return {
            text: (b.getAttribute('aria-label') || b.textContent || '').trim(),
            width: Math.round(r.width),
            height: Math.round(r.height),
          };
        })
        .filter((item) => item.width > 0 && item.height > 0 && (item.width < 24 || item.height < 24));

      const horizontalOverflow = document.documentElement.scrollWidth > window.innerWidth;
      return {
        buttonCount: buttons.length,
        smallTargets,
        horizontalOverflow,
      };
    });

    const report = {
      viewport: '1440x900',
      browserExecutable: path.basename(executablePath),
      loadElapsedMs,
      orbitLatencyMs,
      benchmarkVisibleCount,
      overviewState,
      centralState,
      collapseState,
      consoleErrors,
      pageErrors,
      axeMainViolations: axeMainResults.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
      })),
      axeModalViolations: axeModalResults.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
      })),
      axeMainPasses: axeMainResults.passes.length,
      uiAudit,
    };

    console.log(JSON.stringify(report, null, 2));
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
