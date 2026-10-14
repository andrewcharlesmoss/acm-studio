import test from 'node:test';
import assert from 'node:assert/strict';
import { runnerImport } from 'vite';
const options = { resolve: { dedupe: ['react', 'react-dom'] }, environments: { inline: { resolve: { noExternal: [/^@acm\//] } } } };
const { module: drafts } = await runnerImport('app/studio/draft-global-templates.ts', options);
const { module: templates } = await runnerImport('app/studio/template-model.ts', options);
const { module: backup } = await runnerImport('app/studio/backup-store.ts', options);
const { module: editor } = await runnerImport('app/studio/editor-model.ts', options);
function fixture() {
  const set = templates.createTemplateSet('Shared');
  const source = templates.validateTemplateStore({ ...templates.emptyTemplateStore(), sets: [set], assignments: [{ documentId: 'draft', kind: 'post', setId: set.id, templateId: set.templates.find(t => t.kind === 'post').id }] });
  const library = { format: 'acm-global-templates', version: 1, templates: { ...structuredClone(source), assignments: [] }, migrations: { test: { bindings: [], bases: [] }, test2: { bindings: [], bases: [] } } };
  library.templates.sets[0].styles.palette.accent = '#123456';
  return { source, library };
}
test('drafts use current shared designs while originals, local identity and assignments survive', () => {
  const { source, library } = fixture(); const before = JSON.stringify(source);
  const effective = drafts.draftGlobalTemplates(source, library);
  assert.equal(effective.sets[0].styles.palette.accent, '#123456');
  assert.deepEqual(effective.assignments, source.assignments);
  assert.deepEqual(effective.sets[0].identity, source.sets[0].identity);
  assert.equal(JSON.stringify(source), before);
  library.templates.sets[0].styles.palette.accent = '#654321';
  assert.equal(drafts.draftGlobalTemplates(source, library).sets[0].styles.palette.accent, '#654321');
});
test('shared aliases are resolved by identity, including Test2 ancestry', () => {
  const { source, library } = fixture(); const oldId = source.sets[0].id;
  library.templates.sets[0].id = 'shared-original';
  library.migrations.test2.bindings.push({ setId: oldId, globalSetId: 'shared-original', ids: { 'shared-original': oldId }, overrides: [] });
  const effective = drafts.draftGlobalTemplates(source, library);
  assert.equal(effective.sets[0].id, oldId);
  const snapshot = drafts.globalDraftSnapshot(templates.resolveTemplate(effective, { id: 'draft', kind: 'post' }), source, library);
  assert.equal(snapshot.set.id, 'shared-original');
});
test('unmatched and ambiguous assignments fail visibly without mutating originals', () => {
  const { source, library } = fixture(); const before = JSON.stringify(source);
  library.templates.sets[0] = templates.createTemplateSet('Same name is not ancestry');
  assert.throws(() => drafts.draftGlobalTemplates(source, library), /originals and assignments were kept/);
  assert.equal(JSON.stringify(source), before);
  const other = structuredClone(source.sets[0]); other.id = 'other-local'; source.sets.push(other);
  source.assignments.push({...source.assignments[0],documentId:'other',setId:'other-local'});
  for (const [site, id] of [['test',source.sets[0].id],['test2','other-local']]) library.migrations[site].bindings.push({ setId:id, globalSetId:library.templates.sets[0].id, ids:{}, overrides:[] });
  assert.throws(() => drafts.draftGlobalTemplates(source, library), /ambiguous global ancestry/);
  const first = drafts.recoverDraftTemplateAssignment(source, 'draft', undefined, library);
  assert.equal(first.assignments.length, 1);
  const repaired = drafts.recoverDraftTemplateAssignment(first, 'other', undefined, library);
  assert.doesNotThrow(() => drafts.draftGlobalTemplates(repaired, library));
  assert.equal(repaired.sets.length, 2, 'all ambiguous recovery designs survive detaching');
});
test('assignment updates retain browser artwork, and Undo-style reapplication resolves globals', () => {
  const { source, library } = fixture(); const original = JSON.stringify(source.sets);
  const effective = drafts.draftGlobalTemplates(source, library);
  const detached = drafts.retainDraftTemplateChanges(source, { ...effective, assignments: [] }, library);
  assert.equal(JSON.stringify(detached.sets), original);
  const restored = drafts.retainDraftTemplateChanges(detached, { ...drafts.draftGlobalTemplates(detached, library), assignments: source.assignments }, library);
  assert.deepEqual(restored.assignments, source.assignments);
  assert.equal(templates.resolveTemplate(drafts.draftGlobalTemplates(restored, library), {id:'draft',kind:'post'}).set.styles.palette.accent, '#123456');
});
test('assigning a new shared template appends reader-valid recovery records without replacing originals', () => {
  const { source, library } = fixture(); const original = JSON.stringify(source.sets[0]);
  const extra = templates.createTemplateSet('New shared'); library.templates.sets.push(extra);
  const next = drafts.draftGlobalTemplates(source, library);
  next.assignments = [{ documentId:'new', kind:'page', setId:extra.id, templateId:extra.templates.find(t=>t.kind==='page').id }];
  const saved = drafts.retainDraftTemplateChanges(source, next, library);
  assert.equal(JSON.stringify(saved.sets[0]), original);
  assert.doesNotThrow(() => templates.validateTemplateStore(saved));
  assert.equal(drafts.draftGlobalTemplates(saved, library).sets.length, 2);
});
test('browser design edits and kind mismatches cannot change the shared library', () => {
  const { source, library } = fixture(); const effective = drafts.draftGlobalTemplates(source, library);
  effective.sets[0].name = 'Local override';
  assert.throws(() => drafts.retainDraftTemplateChanges(source, effective, library), /Template designs are shared/);
  source.assignments[0].kind = 'page';
  assert.throws(() => drafts.draftGlobalTemplates(source, library), /different document kind/);
});
test('backup v5 carries both recovery designs and a validated shared library, with older readers retained', () => {
  const { source, library } = fixture();
  const document = { ...editor.createDocument('post', 'draft'), categoryIds: [] };
  const workspace = { version:25, documents:[document], categories:[], bin:[], activeDocumentId:document.id };
  const value = { format:'acm-studio-backup',version:5,exportedAt:new Date().toISOString(),workspace,templates:source,globalTemplates:library,publications:null,media:{folders:[],assets:[]} };
  const saved = backup.validateStudioBackup(value);
  assert.deepEqual(saved.globalTemplates, library);
  assert.deepEqual(saved.templates.sets, source.sets);
  assert.throws(()=>backup.validateStudioBackup({...value,version:4}),/backup v5/);
  assert.throws(()=>backup.validateStudioBackup({...value,globalTemplates:{...library,version:3}}),/Unsupported global/);
  const old = { ...value };
  delete old.globalTemplates;
  assert.doesNotThrow(()=>backup.validateStudioBackup({...old,version:4}));
});

test('backup rejects missing shared artwork even when browser recovery originals do not reference it', () => {
  const { source, library } = fixture();
  library.templates.sets[0].parts[0].nodes.push({id:'shared-image',type:'image',src:'',mediaId:'missing-image',alt:''});
  const document = { ...editor.createDocument('post','draft'),categoryIds:[] };
  const value = {format:'acm-studio-backup',version:5,exportedAt:new Date().toISOString(),workspace:{version:25,documents:[document],categories:[],bin:[],activeDocumentId:document.id},templates:source,globalTemplates:library,publications:null,media:{folders:[],assets:[]}};
  assert.throws(()=>backup.validateStudioBackup(value),/shared template recovery image/);
});
test('binned document restoration keeps its shared assignment and the original template Bin intact', () => {
  const { source, library } = fixture(); const assignment = source.assignments[0];
  source.assignments = [];
  source.bin = [{ id:'deleted-template', deletedAt:new Date().toISOString(), kind:'template', setId:source.sets[0].id,setName:'Shared',entry:source.sets[0].templates[0],setSnapshot:structuredClone(source.sets[0]) }];
  const before = JSON.stringify(source.bin);
  const effective = drafts.draftGlobalTemplates(source,library);
  const restored = drafts.retainDraftTemplateChanges(source,{...effective,assignments:[assignment]},library);
  assert.equal(JSON.stringify(restored.bin),before);
  assert.equal(templates.resolveTemplate(drafts.draftGlobalTemplates(restored,library),{id:'draft',kind:'post'}).templateId,assignment.templateId);
});

test('shared creation does not advertise an Undo that would remove a protected original', async () => {
  const { module: globals } = await runnerImport('app/studio/global-template-contract.ts', options);
  const { library } = fixture(); const before = library.templates;
  const edited = structuredClone(before); edited.sets[0].name='Edited';
  assert.equal(globals.globalTemplateChangeCanUndo(before,edited),true);
  const created = structuredClone(before); created.sets[0].templates.push({...structuredClone(created.sets[0].templates[0]),id:'new-original'});
  assert.equal(globals.globalTemplateChangeCanUndo(before,created),false);
  created.sets.push(templates.createTemplateSet('New originals'));
  assert.equal(globals.globalTemplateChangeCanUndo(before,created),false);
});
