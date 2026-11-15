import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { swiftUIPreviewBridge } from '../scripts/swiftui-preview-bridge.mjs';

function harness(options = {}) {
  let middleware, launches = 0;
  const plugin = swiftUIPreviewBridge({ platform: 'darwin', canExecute: async () => {}, launch: () => { launches++; const child = new EventEmitter(); queueMicrotask(() => child.emit('spawn')); return child; }, ...options });
  plugin.configureServer({ httpServer: { address: () => ({ port: 3010 }) }, middlewares: { use: fn => { middleware = fn; } } });
  async function send(changes = {}, bodyContent = "{}") {
    const request = Object.assign(Readable.from([Buffer.from(bodyContent)]), { url: '/__studio/swiftui-reorder-preview', method: 'POST', socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:3010', origin: 'http://localhost:3010', 'content-type': 'application/json', 'x-studio-client': 'codex-history', 'sec-fetch-site': 'same-origin' }, ...changes });
    let body; const response = { statusCode: 200, setHeader() {}, end(value) { body = JSON.parse(value); } };
    await middleware(request, response, () => {}); return { status: response.statusCode, body };
  }
  return { send, launches: () => launches };
}
test('allows only local same-origin launch and bounds concurrent previews', async () => {
  const h = harness();
  for (const request of [
    { method: 'GET' },
    { socket: { remoteAddress: '192.0.2.1' } },
    { headers: { host: 'evil.test', origin: 'http://localhost:3010', 'content-type': 'application/json', 'x-studio-client': 'codex-history' } },
    { headers: { host: 'localhost:3010', origin: 'https://evil.test', 'content-type': 'application/json', 'x-studio-client': 'codex-history' } },
    { headers: { host: 'localhost:3010', origin: 'http://localhost:3010', 'content-type': 'application/json', 'x-studio-client': 'codex-history', 'sec-fetch-site': 'cross-site' } },
  ]) assert.equal((await h.send(request)).status, 403);
  assert.equal(h.launches(), 0);
  assert.equal((await h.send()).status, 200);
  assert.equal((await h.send()).status, 409);
  assert.equal(h.launches(), 1);
});
test('unavailable executable and non-macOS do not launch', async () => {
  const missing = harness({ canExecute: async () => { throw new Error('missing'); } });
  assert.equal((await missing.send()).status, 503); assert.equal(missing.launches(), 0);
  const other = harness({ platform: 'linux' });
  assert.equal((await other.send()).status, 503); assert.equal(other.launches(), 0);
});

test('rejects oversized requests and recovers after child exit or launch error', async () => {
  let current; let calls = 0;
  const h = harness({ launch: () => {
    calls++; current = new EventEmitter();
    const result = current;
    queueMicrotask(() => calls === 1 ? result.emit('error', new Error('spawn failed')) : result.emit('spawn'));
    return result;
  } });
  assert.equal((await h.send({}, 'x'.repeat(65))).status, 413);
  assert.equal(calls, 0);
  assert.equal((await h.send()).status, 503);
  assert.equal((await h.send()).status, 200);
  current.emit('exit');
  assert.equal((await h.send()).status, 200);
});
