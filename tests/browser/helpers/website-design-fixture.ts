import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createStudioHttpFixture } from '../../helpers/studio-http-fixture.mjs';

/** Real disposable gateway with saved settings, independent of legacy adoption. */
export async function createSavedWebsiteDesignFixture(frontendURL = 'http://localhost:3010') {
  const fixture = await createStudioHttpFixture({ frontendURL });
  try {
    const response = await fetch(`${fixture.origin}/__studio/test-site`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Client': 'codex-history', Origin: fixture.origin }, body: JSON.stringify({ action: 'global-read', siteId: 'test' }) });
    if (!response.ok) throw new Error('The disposable global library could not load.');
    const snapshot = await response.json() as { library: import('../../../app/studio/global-template-contract').GlobalTemplateLibrary };
    snapshot.library.websiteDesignDefaults = { identity: {}, styles: {} };
    await mkdir(path.join(fixture.globalRoot, 'work'), { recursive: true });
    await writeFile(path.join(fixture.globalRoot, 'work/global-template-library.json'), JSON.stringify(snapshot.library));
    return fixture;
  } catch (error) { await fixture.close(); throw error; }
}
