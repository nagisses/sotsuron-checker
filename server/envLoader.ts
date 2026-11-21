import fs from 'node:fs';
import path from 'node:path';

/**
 * Loads key=value pairs from .env and .env.local inside the project root
 * without overriding explicitly supplied process.env variables.
 */
export function loadLocalEnvFiles(projectRoot: string): void {
  const candidates = ['.env', '.env.local'];
  for (const filename of candidates) {
    const filePath = path.join(projectRoot, filename);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    }
  }
}

export function resolveServerApiKey(requestHeaderKey?: string | null): string | null {
  const headerVal = requestHeaderKey?.trim();
  if (headerVal && headerVal.length > 0) return headerVal;
  const envVal = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  return envVal && envVal.length > 0 ? envVal : null;
}
