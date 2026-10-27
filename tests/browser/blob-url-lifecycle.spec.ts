import { expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

test('shared image URLs retain unchanged records and clean up on disable and unmount', async ({ page }) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'acm-blob-urls-'));
  const entry = `
    import React, { useState } from 'react';
    import { createRoot } from 'react-dom/client';
    import { useBlobUrls } from '/app/studio/controls/use-blob-urls.ts';
    const a = new Blob(['a'], { type: 'image/png' }), b = new Blob(['b'], { type: 'image/png' }), c = new Blob(['c'], { type: 'image/png' }), unsafe = new Blob(['bad'], { type: 'image/svg+xml' });
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    window.events = []; window.failCountdown = 0; window.failures = 0;
    URL.createObjectURL = blob => { if (window.failCountdown > 0 && --window.failCountdown === 0) { window.failures++; throw new Error('injected'); } const url = create(blob); window.events.push(['create', url]); return url; };
    URL.revokeObjectURL = url => { window.events.push(['revoke', url]); revoke(url); };
    const combinations = [[{id:'a',blob:a},{id:'b',blob:b}], [{id:'a',blob:a},{id:'c',blob:c}], [{id:'a',blob:unsafe},{id:'a',blob:a}], [{id:'a',blob:a},{id:'b',blob:b},{id:'c',blob:c}]];
    function Probe() {
      const [index,setIndex] = useState(0), [enabled,setEnabled] = useState(true);
      const urls = useBlobUrls(combinations[index], enabled);
      return React.createElement(React.Fragment,null,
        React.createElement('button',{onClick:()=>setIndex(1)},'Replace B'),
        React.createElement('button',{onClick:()=>setIndex(2)},'Duplicate A'),
        React.createElement('button',{onClick:()=>setIndex(0)},'Restore B'),
        React.createElement('button',{onClick:()=>setIndex(3)},'Add B and C'),
        React.createElement('button',{onClick:()=>setEnabled(!enabled)},'Toggle enabled'),
        React.createElement('output',{'data-testid':'a'},urls.a || ''),
        React.createElement('output',{'data-testid':'b'},urls.b || ''),
        React.createElement('output',{'data-testid':'c'},urls.c || ''));
    }
    function App() { const [mounted,setMounted] = useState(true); return React.createElement(React.Fragment,null,React.createElement('button',{onClick:()=>setMounted(false)},'Unmount'),mounted ? React.createElement(Probe) : null); }
    createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));
  `;
  const server = await createServer({ configFile: false, root: process.cwd(), cacheDir, optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-dev-runtime'] }, server: { host: 'localhost', port: 0 }, plugins: [{ name: 'blob-test', resolveId(id) { if (id === 'virtual:blob-test') return '\0virtual:blob-test'; }, load(id) { if (id === '\0virtual:blob-test') return entry; }, configureServer(vite) { vite.middlewares.use('/__blob-test', (_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><div id="root"></div><script type="module" src="/@id/__x00__virtual:blob-test"></script>'); }); } }] });
  try {
    await server.listen(); const address = server.httpServer!.address();
    if (!address || typeof address === 'string') throw new Error('Test server has no port.');
    await page.goto(`http://localhost:${address.port}/__blob-test`);
    const a = page.getByTestId('a'), b = page.getByTestId('b'), c = page.getByTestId('c');
    await expect(a).not.toBeEmpty(); await expect(b).not.toBeEmpty();
    const firstA = await a.textContent(), firstB = await b.textContent();
    await page.getByRole('button', { name: 'Replace B' }).click();
    await expect(c).not.toBeEmpty(); await expect(a).toHaveText(firstA!); await expect(b).toBeEmpty();
    await expect.poll(() => page.evaluate(url => (window as any).events.some((item: string[]) => item[0] === 'revoke' && item[1] === url), firstB)).toBe(true);
    expect(await page.evaluate(url => (window as any).events.some((item: string[]) => item[0] === 'revoke' && item[1] === url), firstA)).toBe(false);
    const firstC = await c.textContent();
    await page.getByRole('button', { name: 'Duplicate A' }).click();
    await expect(a).toHaveText(firstA!); await expect(c).toBeEmpty();
    await expect.poll(() => page.evaluate(url => (window as any).events.some((item: string[]) => item[0] === 'revoke' && item[1] === url), firstC)).toBe(true);
    const eventOffset = await page.evaluate(() => (window as any).events.length);
    await page.evaluate(() => { (window as any).failCountdown = 2; });
    await page.getByRole('button', { name: 'Add B and C' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).failures)).toBe(1);
    await expect(a).toHaveText(firstA!); await expect(b).toBeEmpty();
    const partialEvents = await page.evaluate(offset => (window as any).events.slice(offset), eventOffset);
    expect(partialEvents).toHaveLength(2);
    expect(partialEvents[0][0]).toBe('create'); expect(partialEvents[1]).toEqual(['revoke', partialEvents[0][1]]);
    await page.getByRole('button', { name: 'Toggle enabled' }).click();
    await expect(a).toBeEmpty();
    await expect.poll(() => page.evaluate(url => (window as any).events.some((item: string[]) => item[0] === 'revoke' && item[1] === url), firstA)).toBe(true);
    await page.getByRole('button', { name: 'Toggle enabled' }).click();
    await expect(a).not.toBeEmpty(); await expect(b).not.toBeEmpty();
    const finalA = await a.textContent(), finalB = await b.textContent();
    await page.getByRole('button', { name: 'Unmount' }).click();
    await expect.poll(() => page.evaluate(urls => urls.every(url => (window as any).events.some((item: string[]) => item[0] === 'revoke' && item[1] === url)), [finalA, finalB])).toBe(true);
  } finally { await server.close(); await rm(cacheDir, { recursive: true, force: true }); }
});
