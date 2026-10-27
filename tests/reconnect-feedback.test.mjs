import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Reconnect clears stale page feedback and retains recovery with the site owner', () => {
  const source = readFileSync(new URL('../app/studio/studio-prototype.tsx', import.meta.url), 'utf8');
  const body = source.match(/function reconnectSite\(\) \{([\s\S]*?)\n {2}\}/)[1];
  const calls = [];
  new Function('setSiteFeedback', 'testContext', body)(value => calls.push(value), { reconnect: () => calls.push('reconnect') });
  assert.deepEqual(calls, [null, 'reconnect']);
  assert.match(source, /onReconnect: reconnectSite|onReconnect=\{reconnectSite\}/);
});
