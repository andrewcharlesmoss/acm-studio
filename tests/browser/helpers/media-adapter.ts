import { build } from 'vite';

/** Bundle the production media owners for an isolated browser context. */
export function buildMediaAdapter() { return buildAdapter("tests/browser/fixtures/media-store-adapter.ts", "StudioMediaAdapter"); }
export function buildBackupPredicates() { return buildAdapter("tests/browser/fixtures/backup-predicates.ts", "BackupPredicates"); }

async function buildAdapter(entry: string, name: string) {
  const result = await build({ configFile: false, logLevel: 'error', define: { 'process.env.NODE_ENV': JSON.stringify('production') }, resolve: { dedupe: ['react', 'react-dom'] }, build: { write: false, minify: false, lib: { entry, name, formats: ['iife'] } } });
  const output = Array.isArray(result) ? result[0] : result;
  if (!('output' in output)) throw new Error('The browser module did not build.');
  const chunk = output.output.find(item => item.type === 'chunk' && item.isEntry);
  if (!chunk || !('code' in chunk)) throw new Error('The browser module has no code.');
  return chunk.code;
}
