declare global { interface Window { previewEvents: ([string, number] | [string])[]; } }
import { expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

test('hosted preview retries lost acknowledgements, coalesces changes and recovers from rejection', async ({ page }) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'acm-preview-queue-'));
  const entry = `
    import React, { useRef, useState } from 'react';
    import { createRoot } from 'react-dom/client';
    import { SiteHomeFrame } from '/app/studio/site-editor/site-home-frame.tsx';
    window.previewEvents = [];
    function App() {
      const [id, setId] = useState(1), handle = useRef(null);
      const preview = { previewId: id, design: {}, navigation: {} };
      return React.createElement(React.Fragment, null,
        ...[2,3,4].map(value => React.createElement('button', { key:value, onClick:()=>setId(value) }, 'Preview ' + value)),
        React.createElement(SiteHomeFrame, { site:'test', preview, handleRef:handle, showTemplate:true,
          onEditing:()=>{}, onReopenPanes:()=>{}, onOpenTemplate:()=>{},
          onPreviewSent:id=>window.previewEvents.push(['sent',id]),
          onPreviewApplied:id=>window.previewEvents.push(['applied',id]),
          onPreviewRejected:id=>window.previewEvents.push(['rejected',id]),
          onPreviewReset:()=>window.previewEvents.push(['reset']) }));
    }
    createRoot(document.getElementById('root')).render(React.createElement(App));
  `;
  const child = `<!doctype html><script>
    const protocol='acm-site-editor-home-v1', sessionId=crypto.randomUUID(); let attempts=0, requests=0, confirmations=0, challenge='';
    addEventListener('message', event => {
      if(event.source!==parent || event.origin!==location.origin) return;
      if(event.data.action==='request-session') { if(++requests===1) return; challenge=event.data.challenge; parent.postMessage({protocol,site:'test',action:'ready',sessionId,challenge},location.origin); return; }
      if(event.data.action==='confirm-session' && event.data.sessionId===sessionId) { if(++confirmations===1) return; parent.postMessage({protocol,site:'test',action:'session-confirmed',sessionId,challenge:event.data.challenge},location.origin); return; }
      if(event.data.action!=='set-site-preview' || !event.data.preview) return;
      const previewId=event.data.preview.previewId;
      if(previewId===1 && ++attempts===1) {
        parent.postMessage({protocol,site:'test',action:'ready',sessionId,challenge},location.origin);
        parent.postMessage({protocol,site:'test',action:'site-preview-applied',sessionId:'00000000-0000-4000-8000-000000000002',previewId},location.origin);
        return;
      }
      parent.postMessage({protocol,site:'test',action:previewId===3?'site-preview-rejected':'site-preview-applied',sessionId,previewId},location.origin);
    });
  </script>`;
  const server = await createServer({ configFile: false, root: process.cwd(), cacheDir, optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-dev-runtime'] }, server: { host: 'localhost', port: 0 }, plugins: [{
    name: 'preview-queue-test', resolveId(id) { if (id === 'virtual:preview-queue-test') return '\0virtual:preview-queue-test'; },
    load(id) { if (id === '\0virtual:preview-queue-test') return entry; },
    configureServer(vite) {
      vite.middlewares.use('/__preview-queue', (_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><div id="root"></div><script type="module" src="/@id/__x00__virtual:preview-queue-test"></script>'); });
      vite.middlewares.use('/studio', (_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(child); });
    },
  }] });
  try {
    await server.listen(); const address = server.httpServer!.address();
    if (!address || typeof address === 'string') throw new Error('Test server has no port.');
    await page.goto(`http://localhost:${address.port}/__preview-queue`);
    await expect.poll(() => page.evaluate(() => window.previewEvents), { timeout: 10000 }).toContainEqual(['sent', 1]);
    await page.getByRole('button', { name: 'Preview 2' }).click();
    await page.getByRole('button', { name: 'Preview 3' }).click();
    await expect.poll(() => page.evaluate(() => window.previewEvents), { timeout: 9000 }).toContainEqual(['rejected', 3]);
    const events = await page.evaluate(() => window.previewEvents);
    expect(events).toContainEqual(['applied', 1]);
    expect(events).not.toContainEqual(['sent', 2]);
    expect(events.filter((event: unknown[]) => event[0] === 'reset')).toHaveLength(1);
    await expect(page.getByRole('status')).toContainText('could not be updated');
    await page.getByRole('button', { name: 'Preview 4' }).click();
    await expect.poll(() => page.evaluate(() => window.previewEvents)).toContainEqual(['applied', 4]);
    await expect(page.getByRole('status')).toHaveCount(0);
    const finalEvents = await page.evaluate(() => window.previewEvents);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.previewEvents)).toEqual(finalEvents);
    await page.locator('iframe').evaluate(frame => (frame as HTMLIFrameElement).contentWindow!.location.reload());
    await expect.poll(() => page.evaluate(() => window.previewEvents.filter((event: unknown[]) => event[0] === 'reset').length), { timeout: 10000 }).toBe(2);
    await expect.poll(() => page.evaluate(() => window.previewEvents.filter((event: unknown[]) => event[0] === 'applied' && event[1] === 4).length)).toBe(2);
  } finally { await server.close(); await rm(cacheDir, { recursive: true, force: true }); }
});
