import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright-core';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
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

async function run() {
  const chromeApp =
    '/Users/ponchanponchannn/Library/Caches/ms-playwright/chromium-1254/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  const { server, port } = await startStaticServer();
  const baseUrl = `http://127.0.0.1:${port}/`;
  let browser;

  try {
    browser = await chromium.launch({
      executablePath: chromeApp,
      headless: true,
      args: [
        '--headless=new',
        '--no-sandbox',
        '--enable-webgl',
        '--use-gl=angle',
        '--use-angle=metal',
        '--ignore-gpu-blocklist',
      ],
    });

    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForTimeout(3000);

    const highStats = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      const gl = c?.getContext('webgl2') || c?.getContext('webgl');
      return {
        renderer: gl ? gl.getParameter(gl.RENDERER) : 'unknown',
        vendor: gl ? gl.getParameter(gl.VENDOR) : 'unknown',
        city: window.__THESIS_CITY__?.getState(),
      };
    });

    await page.getByRole('button', { name: 'STD' }).click();
    await page.waitForTimeout(1500);
    const stdStats = await page.evaluate(() => window.__THESIS_CITY__?.getState());

    await page.getByRole('button', { name: 'LOW' }).click();
    await page.waitForTimeout(1500);
    const lowStats = await page.evaluate(() => window.__THESIS_CITY__?.getState());

    console.log(JSON.stringify({ highStats, stdStats, lowStats }, null, 2));
  } finally {
    await browser?.close();
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
