import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProductionModule } from './production-module.mjs';
import { withHtmlDom } from './html-dom-fixture.mjs';

const load = path => loadProductionModule(new URL(path, import.meta.url));
const services = await load('../app/content/social-services.ts');
const editor = await load('../app/studio/editor-model.ts');
const validation = await load('../app/studio/workspace-validation.ts');
const publication = await load('../app/content/local-publishing.ts');
const templates = await load('../app/studio/template-model.ts');
const packages = await load('../app/studio/template-package.ts');
const globalTemplates = await load('../app/studio/global-template-contract.ts');
const fixtures = await load('../app/studio/test-site/contract.ts');
const clipboard = await load('../app/studio/block-clipboard.ts');
const backups = await load('../app/studio/backup-store.ts');
const html = await load('../app/studio/studio-html-editor.ts');

const socialLink = (id, service, url, extra = {}) => ({ id, type: 'social-link', service, url, ...extra });
const block = {
  id: 'social-parent', type: 'social-icons', showLabels: true, openInNewTab: true,
  children: [socialLink('site', 'chain', 'example.test', { label: 'Project site' }), socialLink('mail', 'mail', 'hello@example.test')],
};

function currentWorkspace() {
  const workspace = structuredClone(editor.initialStudioWorkspace);
  const post = workspace.documents.find(item => item.kind === 'post');
  post.blocks = [structuredClone(block)];
  return { workspace, post };
}

test('matches the 47 built-in service keys and labels, with safe Link/email and new-tab rel semantics', () => {
  assert.equal(services.coreSocialServiceIcon('linkedin'), 'social.service.linkedin');
  assert.equal(services.coreSocialServiceIcon('tiktok'), 'social.service.tiktok');
  assert.equal(services.coreSocialServices.length, 47);
  assert.equal(new Set(services.coreSocialServices.map(item => item.id)).size, 47);
  for (const { id, label } of services.coreSocialServices) {
    assert.equal(services.isCoreSocialService(id), true);
    assert.equal(typeof label, 'string');
    assert.ok(label.length > 0);
    assert.equal(typeof services.coreSocialServiceIcon(id), 'string');
  }
  assert.equal(services.coreSocialServiceLabel('chain'), 'Link');
  assert.equal(services.socialServiceHref('hello@example.test'), 'mailto:hello@example.test');
  assert.equal(services.socialServiceHref('example.test/path'), 'https://example.test/path');
  assert.equal(services.socialServiceHref('javascript:alert(1)'), null);
  assert.equal(services.socialServiceHref('data:text/html,bad'), null);
  assert.equal(services.socialServiceRel('sponsored', true), 'sponsored noopener nofollow');
  assert.equal(services.socialServiceRel('ugc NOOPENER', true), 'ugc NOOPENER nofollow');
  assert.equal(services.socialServiceRel('sponsored', false), 'sponsored');
});

test('generic Social Link records are direct Social Icons children, while legacy widgets still validate', () => {
  assert.equal(validation.validContentBlocks([block]), true);
  assert.equal(validation.validContentBlocks([socialLink('standalone', 'chain', 'example.test')]), false);
  assert.equal(validation.validContentBlocks([{ id: 'group', type: 'group', layout: 'flow', children: [socialLink('nested', 'mail', 'a@example.test')] }]), false);
  assert.equal(validation.validContentBlocks([{ ...structuredClone(block), children: [socialLink('unknown', 'custom', 'https://example.test')] }]), false);
  assert.equal(validation.validContentBlocks([{ id: 'old-social', type: 'social-icons', children: [{ id: 'legacy', type: 'social-linkedin', url: 'https://linkedin.com/in/example' }] }]), true);
});

test('workspace and publication versions round-trip new services and reject them under older envelopes', () => {
  const { workspace, post } = currentWorkspace();
  assert.equal(workspace.version, 56);
  assert.equal(validation.validateStudioWorkspace(workspace).documents.find(item => item.id === post.id).blocks[0].children[0].service, 'chain');
  assert.throws(() => validation.validateStudioWorkspace({ ...workspace, version: 49 }), /saved workspace is invalid/);
  const article = publication.toLocallyPublishedArticle(post);
  assert.equal(validation.validatePublicationSnapshot({ version: 41, posts: [article] }).posts[0].blocks[0].children[1].url, 'hello@example.test');
  assert.throws(() => validation.validatePublicationSnapshot({ version: 40, posts: [article] }), /Social Link services require published-post snapshot v41/);
  const legacyPost = { ...post, blocks: [{ id: 'legacy-parent', type: 'social-icons', children: [{ id: 'legacy-linkedin', type: 'social-linkedin', url: 'https://linkedin.com/in/example' }] }] };
  assert.doesNotThrow(() => validation.validateStudioWorkspace({ ...workspace, version: 49, documents: workspace.documents.map(item => item.id === post.id ? legacyPost : item) }));
});

test('template, package, global library and fixture envelopes preserve service children with explicit version gates', () => {
  const set = templates.createTemplateSet('Social services');
  const template = set.templates.find(item => item.kind === 'post');
  template.nodes = [structuredClone(block)];
  const store = { ...templates.emptyTemplateStore(), sets: [set] };
  assert.equal(templates.validateTemplateStore(store).version, '0.67.0');
  assert.equal(templates.validateTemplateStore(store).sets[0].templates.find(item => item.kind === 'post').nodes[0].children[0].service, 'chain');
  assert.throws(() => templates.validateTemplateStore({ ...store, version: '0.60.0' }), /Social Link services require template v0.61.0/);
  assert.equal(templates.validateTemplateSnapshot({ version: '0.61.0', set, templateId: template.id }).version, '0.67.0');
  assert.throws(() => templates.validateTemplateSnapshot({ version: '0.60.0', set, templateId: template.id }), /Social Link services require template v0.61.0/);
  const templatePackage = { format: 'acm-studio-template-set', version: '0.61.0', set, media: [] };
  assert.equal(packages.validateTemplatePackage(templatePackage).version, '0.67.0');
  assert.throws(() => packages.validateTemplatePackage({ ...templatePackage, version: '0.60.0' }), /Social Link services require template v0.61.0/);

  const navSet = { ...templates.createTemplateSet('Navigation'), id: 'navigation', templates: [], parts: [{ id: 'nav', name: 'Header', kind: 'header', nodes: [{ id: 'menu', type: 'element', element: 'navigation' }] }] };
  const siteTemplates = { ...store, sets: [set, navSet] };
  const library = globalTemplates.createGlobalTemplateLibrary({
    test: { templates: siteTemplates, siteNavigation: { setId: 'navigation', partId: 'nav' } },
    test2: { templates: structuredClone(siteTemplates), siteNavigation: { setId: 'navigation', partId: 'nav' } },
  });
  assert.equal(library.version, 37);
  assert.equal(globalTemplates.validateGlobalTemplateLibrary(library).version, 37);
  assert.throws(() => globalTemplates.validateGlobalTemplateLibrary({ ...library, version: 30 }), /Social Link services require global template library v31/);

  const legacySet = templates.createTemplateSet('Legacy site');
  const navigation = { ...structuredClone(legacySet), id: 'legacy-navigation', templates: [], parts: [{ id: 'legacy-nav-part', name: 'Navigation', kind: 'header', nodes: [{ id: 'legacy-menu', type: 'element', element: 'navigation' }] }] };
  const legacyFixture = { format: 'acm-test-site', version: 9, siteId: 'test', documents: [{ id: 'home', kind: 'page', title: 'Home', slug: '', excerpt: '', status: 'published', updatedAt: '2026-10-22T00:00:00.000Z', tags: [], seoTitle: '', seoDescription: '', blocks: [] }], categories: [], bin: [], activeDocumentId: 'home', homeDocumentId: 'home', templates: { ...templates.emptyTemplateStore(), sets: [legacySet, navigation] }, siteNavigation: { setId: navigation.id, partId: 'legacy-nav-part' }, browserImportComplete: true, globalTemplates: [], publications: [{ document: { id: 'home', kind: 'page', title: 'Home', slug: '', excerpt: '', status: 'published', updatedAt: '2026-10-22T00:00:00.000Z', tags: [], seoTitle: '', seoDescription: '', blocks: [] } }] };
  const fixture = fixtures.testSiteCollection(legacyFixture);
  fixture.documents[0].blocks = [structuredClone(block)];
  assert.equal(fixture.version, 45);
  assert.equal(fixtures.validTestSiteDocument(fixture), true);
  assert.equal(fixtures.testSiteWorkspace(fixture).version, 56);
  assert.equal(fixtures.validTestSiteDocument({ ...fixture, version: 38 }), false);
});

test('clipboard and backup preserve all new service fields and reject older outer envelopes', () => {
  const { workspace } = currentWorkspace();
  const backup = { format: 'acm-studio-backup', version: 27, exportedAt: '2026-10-29T00:00:00.000Z', workspace, publications: null, media: { folders: [], assets: [] } };
  assert.equal(backups.validateStudioBackup(backup).workspace.documents.find(item => item.kind === 'post').blocks[0].children[0].service, 'chain');
  assert.throws(() => backups.validateStudioBackup({ ...backup, version: 26 }), /Social Link services require backup v27/);

  const previousParser = globalThis.DOMParser;
  const payload = { format: 'acm-studio-blocks', version: 27, blocks: [block], footnotes: [] };
  try {
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => JSON.stringify(payload) }) }; } };
    assert.equal(clipboard.readBlockClipboardPayload('data-acm-studio-blocks="fixture"').blocks[0].children[1].url, 'hello@example.test');
    globalThis.DOMParser = class { parseFromString() { return { querySelector: () => ({ getAttribute: () => JSON.stringify({ ...payload, version: 26 }) }) }; } };
    assert.equal(clipboard.readBlockClipboardPayload('data-acm-studio-blocks="fixture"'), null);
  } finally {
    if (previousParser === undefined) delete globalThis.DOMParser;
    else globalThis.DOMParser = previousParser;
  }
});

test('HTML inspection keeps generic service, URL, label, and rel round-trippable', () => {
  const authored = { ...structuredClone(block), children: [socialLink('mail', 'mail', 'hello@example.test', { label: 'Email us', rel: 'sponsored' })] };
  const markup = html.blocksToHtml([authored]);
  assert.match(markup, /data-social-service="mail"/);
  assert.match(markup, /href="mailto:hello@example\.test"/);
  assert.match(markup, /data-social-url="hello@example\.test"/);
  const parsed = withHtmlDom(() => html.parseHtmlToBlocks(markup, [authored]));
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.blocks[0].children[0].type, 'social-link');
  assert.equal(parsed.blocks[0].children[0].service, 'mail');
  assert.equal(parsed.blocks[0].children[0].url, 'mailto:hello@example.test');
  assert.equal(parsed.blocks[0].children[0].label, 'Email us');
  assert.equal(parsed.blocks[0].children[0].rel, 'sponsored');
});
