import http from 'node:http';
import path from 'node:path';
import { handleApiRequest } from './apiHandler';
import { loadLocalEnvFiles } from './envLoader';

const projectRoot = path.resolve(import.meta.dirname, '..');
loadLocalEnvFiles(projectRoot);

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '127.0.0.1';

const server = http.createServer(async (req, res) => {
  const handled = await handleApiRequest(req, res);
  if (!handled) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Only /api/* endpoints are served here.' }));
  }
});

server.listen(PORT, HOST, () => {
  const configured = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  console.log(
    JSON.stringify({
      service: 'thesis-apocalypse-api',
      listening: `http://${HOST}:${PORT}`,
      geminiConfigured: configured,
    }),
  );
});
