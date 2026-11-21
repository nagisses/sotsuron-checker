import path from 'node:path';
import esbuild from 'esbuild';

const root = path.resolve(import.meta.dirname, '..');

await esbuild.build({
  entryPoints: [
    path.join(root, 'server/cliServer.ts'),
    path.join(root, 'server/apiHandler.ts'),
    path.join(root, 'server/envLoader.ts'),
    path.join(root, 'server/geminiClient.ts'),
  ],
  outdir: path.join(root, 'dist-server'),
  outExtension: { '.js': '.mjs' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  packages: 'external',
  sourcemap: false,
});

console.log('Built server bundles cleanly into dist-server/');
