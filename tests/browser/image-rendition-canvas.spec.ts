import { expect, test } from '@playwright/test';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

test('real Image sizes flow through the content canvas in Edit and Preview', async ({ page }) => {
  test.setTimeout(120000);
  const fixture = (await readFile('public/specimens/landscape.png')).toString('base64');
  const cacheDir = await mkdtemp(join(tmpdir(), 'acm-rendition-vite-'));
  const entry = `
    import React, { useState, useEffect, useCallback } from 'react';
    import { createRoot } from 'react-dom/client';
    import { generateImageRenditions } from '/app/studio/image-rendition-generation.ts';
    import { useStudioMediaOwner } from '/app/studio/use-studio-media.ts';
    import { StudioCanvas } from '/app/studio/studio-canvas.tsx';
    const raw = Uint8Array.from(atob(${JSON.stringify(fixture)}), c => c.charCodeAt(0));
    const original = new Blob([raw], { type: 'image/png' });
    const blank = () => {};
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    window.__resourceEvents = [];
    URL.createObjectURL = blob => { const url = create(blob); window.__resourceEvents.push(['create', url]); return url; };
    URL.revokeObjectURL = url => { window.__resourceEvents.push(['revoke', url]); revoke(url); };
    function Editor({ asset, pin, secondPin }) {
      const [preview, setPreview] = useState(false), [missing, setMissing] = useState(false), [text, setText] = useState('One');
      const getAsset = useCallback(async () => asset, [asset]);
      const image = { id: 'image', type: 'image', src: '', mediaId: 'media', alt: 'Generated size', imageResolution: missing ? { ...pin, renditionDigest: 'c'.repeat(64) } : pin };
      const otherImage = { id: 'other-image', type: 'image', src: '', mediaId: 'media', alt: 'Other size', imageResolution: secondPin };
      const doc = { id: 'doc', kind: 'post', title: 'Test', slug: 'test', excerpt: '', status: 'draft', updatedAt: '2026-01-01T00:00:00Z', tags: [], seoTitle: '', seoDescription: '', blocks: [{ id: 'group', type: 'group', layout: 'flow', children: [image, otherImage] }, { id: 'text', type: 'paragraph', text }] };
      const media = useStudioMediaOwner({ documents: [doc], activeDocument: doc, updateActiveDocument: () => true, updateBlock: blank, onSelectBlock: blank, onReturnToDocument: blank }, { revision: 0, getMediaAsset: getAsset });
      return React.createElement(React.Fragment, null,
        React.createElement('button', { onClick: () => setPreview(!preview) }, 'Toggle preview'),
        React.createElement('button', { onClick: () => setMissing(!missing) }, 'Toggle missing'),
        React.createElement('button', { onClick: () => setText(text === 'One' ? 'Two' : 'One') }, 'Change text'),
        React.createElement(StudioCanvas, { activeDocument: doc, writable: true, previewing: preview, onPreviewChange: setPreview, wordCount: 0, characterCount: 0, linkTargets: [], showCoverImage: false, mediaBlockUrls: media.blockUrls, imageRenditionUrls: media.renditionUrls, selectedBlockId: null, dragOverIndex: null, showInserter: false, inserterQuery: '', filteredBlocks: [], publishFeedback: null, onOpenInserter: blank, onSetPublishFeedback: blank, onDocumentFieldChange: blank, onApplyDocumentCode: blank, onFocusDocumentField: blank, onOpenCoverMediaLibrary: blank, onRemoveCoverImage: blank, onSelectBlock: blank, onClearBlockSelection: blank, onSetDragOverIndex: blank, onMoveBlockTo: blank, onMoveBlock: blank, onDuplicateBlock: blank, onRemoveBlock: blank, onRemoveBlocks: blank, onUpdateBlock: blank, onSplitParagraph: blank, onMergeParagraphBackward: blank, onSplitParagraphs: blank, onExitList: blank, onInsertBlock: blank, onInsertBlockAt: blank, onSetShowInserter: blank, onSetInserterQuery: blank })
      );
    }
    function App() {
      const [ready, setReady] = useState(null);
      useEffect(() => { generateImageRenditions(original).then(bundle => {
        const variant = bundle.variants.find(item => item.key === 'medium');
        const thumbnail = bundle.variants.find(item => item.key === 'thumbnail');
        const pin = { key: variant.key, sourceDigest: bundle.sourceDigest, renditionDigest: variant.digest };
        const secondPin = { key: thumbnail.key, sourceDigest: bundle.sourceDigest, renditionDigest: thumbnail.digest };
        setReady({ pin, secondPin, asset: { id: 'media', name: 'Image', type: 'image/png', size: original.size, blob: original, imageRenditions: { version: 1, bundles: [bundle] } } });
      }); }, []);
      return ready ? React.createElement(Editor, ready) : React.createElement('p', null, 'Preparing image');
    }
    function Root() {
      const [mounted, setMounted] = useState(true);
      return React.createElement(React.Fragment, null, React.createElement('button', { onClick: () => setMounted(false) }, 'Unmount editor'), mounted ? React.createElement(App) : null);
    }
    createRoot(document.getElementById('root')).render(React.createElement(Root));
  `;
  const server = await createServer({ configFile: false, root: process.cwd(), cacheDir, optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom', 'react-dom/client', 'react-dom/server', 'react/jsx-dev-runtime', 'katex', 'highlight.js/lib/core', ...['bash', 'cpp', 'csharp', 'css', 'go', 'java', 'javascript', 'json', 'markdown', 'php', 'python', 'sql', 'typescript', 'xml', 'yaml'].map(name => `highlight.js/lib/languages/${name}`)] }, server: { host: 'localhost', port: 0, strictPort: false, fs: { allow: [process.cwd(), join(process.cwd(), '..')] } }, plugins: [{ name: 'image-rendition-test', resolveId(id) { if (id === 'virtual:image-rendition-test') return '\0virtual:image-rendition-test'; }, load(id) { if (id === '\0virtual:image-rendition-test') return entry; }, configureServer(vite) { vite.middlewares.use('/__image-size', (_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><div id="root"></div><script type="module" src="/@id/__x00__virtual:image-rendition-test"></script>'); }); } }] });
  try {
    await server.listen();
    const address = server.httpServer!.address();
    if (!address || typeof address === 'string') throw new Error('Test server has no port.');
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`http://localhost:${address.port}/__image-size`);
    const image = page.getByRole('img', { name: 'Generated size', exact: true });
    try { await expect(image).toBeVisible(); } catch (error) { throw new Error(`Editor fixture failed: ${errors.join(' | ')}`, { cause: error }); }
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(300);
    const originalUrl = await image.getAttribute('src');
    const other = page.getByRole('img', { name: 'Other size', exact: true });
    await expect(other).toBeVisible();
    const otherUrl = await other.getAttribute('src');
    await page.getByRole('button', { name: 'Change text' }).click();
    await expect(image).toHaveAttribute('src', originalUrl!);
    await page.getByRole('button', { name: 'Toggle preview' }).click();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(300);
    await page.getByRole('button', { name: 'Toggle missing' }).click();
    await expect(page.getByText(/selected image size is unavailable/i)).toBeVisible();
    await expect(image).toHaveCount(0);
    await expect(other).toHaveAttribute('src', otherUrl!);
    expect(await page.evaluate(url => (window as any).__resourceEvents.some((event: string[]) => event[0] === 'revoke' && event[1] === url), otherUrl)).toBe(false);
    await expect.poll(() => page.evaluate(url => (window as any).__resourceEvents.some((event: string[]) => event[0] === 'revoke' && event[1] === url), originalUrl)).toBe(true);
    await page.getByRole('button', { name: 'Toggle missing' }).click();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(300);
    const restoredUrl = await image.getAttribute('src');
    await page.getByRole('button', { name: 'Unmount editor' }).click();
    await expect.poll(() => page.evaluate(url => (window as any).__resourceEvents.some((event: string[]) => event[0] === 'revoke' && event[1] === url), restoredUrl)).toBe(true);
  } finally { await server.close(); await rm(cacheDir, { recursive: true, force: true }); }
});
