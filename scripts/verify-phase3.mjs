import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

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

async function run() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error('dist/ not found. Run npm run build first.');
  }

  const { server, port } = await startStaticServer();
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
        : [
            '--no-sandbox',
            '--enable-webgl',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
          ],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

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
            if (!entry.hadRecentInput) window.__CWV__.cls += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      } catch {
        // ignore
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(2600);

    const initialState = await page.evaluate(() => ({
      city: window.__THESIS_CITY__?.getState(),
      cwv: window.__CWV__,
    }));

    // 1. Test clicking an Evidence building row (EVD-01) -> Building Inspection camera
    await page.locator('[data-node-id="EVD-01"]').click();
    await page.waitForTimeout(1600);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'phase3-01-building-inspection.png'),
    });
    const buildingInspectState = await page.evaluate(() => window.__THESIS_CITY__?.getState());

    // 2. Test expanding Connected Link accordion & clicking Edge -> Bridge Inspection camera
    await page.getByRole('button', { name: /つながりのある要素/i }).click();
    await page.waitForTimeout(200);
    await page.locator('.edge-link-btn').first().click();
    await page.waitForTimeout(1600);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'phase3-02-bridge-inspection.png'),
    });
    const edgeInspectState = await page.evaluate(() => window.__THESIS_CITY__?.getState());

    // 3. Test Role Filter ("問題あり") + Keyboard '3' -> Destruction Cinematic
    await page.getByRole('button', { name: /問題あり/i }).click();
    await page.waitForTimeout(300);
    const filteredChipCount = await page.locator('.node-list-box .node-list-row').count();
    await page.keyboard.press('3');
    await page.waitForTimeout(1600);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'phase3-03-filtered-faults.png'),
    });
    const faultState = await page.evaluate(() => window.__THESIS_CITY__?.getState());

    // 4. Test Accordion expand/collapse + Next Sector ']' keyboard navigation
    await page.getByRole('button', { name: /該当する原文/i }).click();
    await page.waitForTimeout(200);
    const passageExpandedAfterClick = await page
      .getByRole('button', { name: /該当する原文/i })
      .getAttribute('aria-expanded');

    await page.getByRole('button', { name: /すべて/i }).click();
    await page.keyboard.press(']');
    await page.waitForTimeout(600);
    const afterStepState = await page.evaluate(() => window.__THESIS_CITY__?.getState());

    // 5. Run Axe WCAG 2.2 AA audit on Phase 3 interactive state
    await page.evaluate(axeSource);
    const axeResults = await page.evaluate(async () => {
      return window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      });
    });

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
      return {
        buttonCount: buttons.length,
        smallTargets,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });

    console.log(
      JSON.stringify(
        {
          initialState,
          buildingInspectState,
          edgeInspectState,
          filteredChipCount,
          faultState,
          passageExpandedAfterClick,
          afterStepState,
          consoleErrors,
          pageErrors,
          axeViolations: axeResults.violations,
          axePasses: axeResults.passes.length,
          uiAudit,
        },
        null,
        2,
      ),
    );
    if (consoleErrors.length > 0 || pageErrors.length > 0 || axeResults.violations.length > 0) {
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
