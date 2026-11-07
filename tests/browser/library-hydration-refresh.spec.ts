import { expect, test } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';

// This opt-in regression uses a disposable checkout: refreshing the user's
// running development server or touching their source files would disturb work.
test('Library direct entry hydrates during a development refresh', async ({ browser }) => {
  test.skip(process.env.STUDIO_HMR_REGRESSION !== '1', 'Run with STUDIO_HMR_REGRESSION=1');
  test.setTimeout(240_000);
  const sourceRoot = process.cwd();
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'studio-hydration-'));
  const checkout = path.join(tempRoot, 'acm-studio');
  const hostPath = 'app/studio/ui/studio-ui-section-host.tsx';
  let server: ReturnType<typeof spawn> | undefined;
  try {
    await mkdir(checkout);
    const archive = execFileSync('git', ['archive', 'HEAD'], { cwd: sourceRoot, maxBuffer: 100 * 1024 * 1024 });
    execFileSync('tar', ['-x', '-C', checkout], { input: archive });
    // Exercise the candidate source, including changes not committed yet.
    await writeFile(path.join(checkout, hostPath), await readFile(path.join(sourceRoot, hostPath)));
    await symlink(path.join(sourceRoot, 'node_modules'), path.join(checkout, 'node_modules'), 'dir');
    await mkdir(path.join(tempRoot, 'acm-styles'));
    await cp(path.join(sourceRoot, '../acm-styles/src'), path.join(tempRoot, 'acm-styles/src'), { recursive: true });
    await mkdir(path.join(tempRoot, 'workspace-governance'));
    await cp(path.join(sourceRoot, '../workspace-governance/STYLE_GUIDE.md'), path.join(tempRoot, 'workspace-governance/STYLE_GUIDE.md'));
    const port = await new Promise<number>((resolve, reject) => {
      const socket = createServer();
      socket.once('error', reject);
      socket.listen(0, '127.0.0.1', () => { const address = socket.address(); if (!address || typeof address === 'string') return reject(new Error('Cannot reserve a test port')); const port = address.port; socket.close(() => resolve(port)); });
    });
    const origin = `http://localhost:${port}`;
    server = spawn(path.join(sourceRoot, 'node_modules/.bin/vinext'), ['dev', '--host', 'localhost', '--port', String(port)], { cwd: checkout, stdio: 'ignore', detached: true, env: { ...process.env, WRANGLER_WRITE_LOGS: 'false' } });
    server.on('error', () => {});
    await expect.poll(async () => { if (server?.exitCode !== null) throw new Error('Disposable development server exited'); try { return (await fetch(`${origin}/studio/ui/blocks/navigation`)).ok; } catch { return false; } }, { timeout: 90_000, intervals: [500] }).toBe(true);
    for (let i = 0; i < 12; i++) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        const now = new Date();
        await utimes(path.join(checkout, 'app/studio/ui/blocks/block-specimen-catalogue.tsx'), now, now);
        await page.goto(`${origin}/studio/ui/blocks/navigation`, { waitUntil: 'networkidle' });
        await expect(page.getByText('Mobile menu example', { exact: true })).toBeVisible();
        expect(errors.filter(error => /hydrat/i.test(error)), `Refresh attempt ${i + 1}`).toEqual([]);
      } finally { await context.close(); }
    }
  } finally {
    if (server?.pid && server.exitCode === null) {
      const child = server;
      await new Promise<void>(resolve => {
        const timer = setTimeout(() => { try { process.kill(-child.pid!, 'SIGKILL'); } catch { /* The child may exit between the guard and the signal. */ } }, 5000);
        child.once('exit', () => { clearTimeout(timer); resolve(); });
        try { process.kill(-child.pid!, 'SIGTERM'); } catch { clearTimeout(timer); resolve(); }
      });
    }
    await rm(tempRoot, { recursive: true, force: true });
  }
});
