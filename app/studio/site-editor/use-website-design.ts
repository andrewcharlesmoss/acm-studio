"use client";
import { readWebsiteDesignStartup } from "./website-design-startup-cache";
import { useEffect, useLayoutEffect, useReducer, useSyncExternalStore, useRef, useState, useMemo, type Dispatch } from "react";
import { testSiteCollection } from "../test-site/contract";
import { localSitePublicationSnapshots } from "../test-site/local-publication";
import { migrateGlobalTemplateBindings } from "../global-template-contract";
import { createIdentityStore } from "./identity-repository";
import { createIdentityPreview, identityPreviewReducer, type IdentityAction, type IdentityValues } from "./identity-preview-state";
import { createStylesPreview, stylesPreviewReducer, type StyleAction, type StyleValues } from "./styles-preview-state";
import { hydrateWebsiteDesign, legacyWebsiteDefaults, serialiseWebsiteDesign, mergeWebsiteDesign, WebsiteDesignConflictError, type WebsiteDesign } from "./website-design";
import { WEBSITE_STYLE_VALIDATION_ERROR } from "./website-style-validation";
import type { SiteEditorSessions } from "./use-site-editor-sessions";

const unavailableSettings = {
  global: 'Global settings cannot be saved yet. Your draft was preserved.',
  test: 'Test settings cannot be saved. Your draft was preserved.',
  test2: 'Test2 settings cannot be saved. Your draft was preserved.',
} as const;
const reconnectingSettings = {
  global: 'Reconnecting Global Defaults — settings draft preserved.',
  test: 'Reconnecting Test — settings draft preserved.',
  test2: 'Reconnecting Test2 — settings draft preserved.',
} as const;
const unconfirmedSave = 'The primary Studio tab stopped responding.';
const siteSettingsConflict = 'This site’s settings changed while you were editing. Your draft was preserved.';
function sameDesign(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value,index) => sameDesign(value,right[index]));
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  const first = left as Record<string, unknown>, second = right as Record<string, unknown>;
  const keys = Object.keys(first).filter(key => first[key] !== undefined);
  const otherKeys = Object.keys(second).filter(key => second[key] !== undefined);
  return keys.length === otherKeys.length && keys.every(key => Object.hasOwn(second,key) && sameDesign(first[key],second[key]));
}

/** Settings use the existing site/global peers; only the global writer reaches disk. */
export function useWebsiteDesign(sessions: SiteEditorSessions) {
  const { test: first, test2: second, globals } = sessions;
  const [history, rawIdentity] = useReducer(identityPreviewReducer, undefined, createIdentityPreview);
  const [stylesHistory, rawStyles] = useReducer(stylesPreviewReducer, undefined, createStylesPreview);
  const cached = useMemo(()=>readWebsiteDesignStartup(),[]);
  const startup = useSyncExternalStore(()=>()=>{},()=>cached,()=>null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Loading saved website settings…');
  const [failureState, setFailure] = useState<string | { message: string; scope: 'global' | 'test' | 'test2'; conflict: WebsiteDesignConflictError } | { message: string; scope: 'global' | 'test' | 'test2'; submitted: WebsiteDesign }>('');
  const failure = typeof failureState === 'string' ? failureState : failureState.message;
  const settingsConflict = typeof failureState !== 'string' && 'conflict' in failureState ? failureState : null;
  const uncertainSave = typeof failureState !== 'string' && 'submitted' in failureState ? failureState : null;
  const dirty = useRef(false);
  const pending = useRef(false);
  const generation = useRef(0);
  const base = useRef<Record<"global"|"test"|"test2",WebsiteDesign> | null>(null);
  const [saveEpoch,setSaveEpoch] = useState(0);
  const [reloadEpoch,setReloadEpoch] = useState(0);
  const accepted = useRef('');
  const present = useMemo(() => ({ history, stylesHistory }),[history,stylesHistory]);
  const current = useRef(present);
  useLayoutEffect(() => { current.current = present; },[present]);
  const sources = first.draft && second.draft && globals.library ? {
    global: globals.library.websiteDesignDefaults ?? legacyWebsiteDefaults(globals.library.templates.sets.find(set => set.id !== 'studio-global-navigation')!.styles),
    test: (() => { const site = testSiteCollection(first.draft); return site.websiteDesign ?? { identity: { title: site.templates.sets.find(set => set.id === site.siteNavigation.setId)?.identity.name ?? 'Test', tagline: '' }, styles: {} }; })(),
    test2: (() => { const site = testSiteCollection(second.draft); return site.websiteDesign ?? { identity: { title: site.templates.sets.find(set => set.id === site.siteNavigation.setId)?.identity.name ?? 'Test2', tagline: '' }, styles: {} }; })(),
  } : null;
  const signature = sources ? JSON.stringify(sources) : '';
  const sourceRef = useRef(sources);
  useLayoutEffect(() => { sourceRef.current = sources; });
  useEffect(() => {
    if (!signature || accepted.current === signature || dirty.current || pending.current) return;
    let alive = true;
    const hydrationGeneration = generation.current;
    queueMicrotask(()=>{ if (alive) setReady(false); });
    const next = sourceRef.current!;
    void (async () => {
      // Read former Global Defaults without copying sample Test/Test2 identities.
      let global = next.global;
      let legacyIdentity: IdentityValues['global'] | undefined;
      if (!globals.library?.websiteDesignDefaults) {
        const saved = await createIdentityStore(window.indexedDB).read();
        if (saved) legacyIdentity = saved.values.global;
      }
      const values = await Promise.all((['global','test','test2'] as const).map(async scope => [scope, await hydrateWebsiteDesign(next[scope], src => `/__studio/site-media/${scope}/${src.slice(7)}`)] as const));
      if (!alive || dirty.current || generation.current !== hydrationGeneration) return;
      const identities = Object.fromEntries(values.map(([scope,value]) => [scope,value.identity])) as IdentityValues;
      const styles = Object.fromEntries(values.map(([scope,value]) => [scope,value.styles])) as StyleValues;
      if (legacyIdentity) identities.global = legacyIdentity;
      if (!globals.library?.websiteDesignDefaults && !globals.session.writable) return;
      rawIdentity({ type: 'hydrate', values: identities });
      rawStyles({ type: 'hydrate', values: styles });
      accepted.current = signature; setReady(Boolean(globals.library?.websiteDesignDefaults)); setStatus('Website settings saved locally.');
      // Adopt the previous authoritative Global Defaults once, through normal CAS.
      if (!globals.library?.websiteDesignDefaults && globals.session.writable) {
        global = await serialiseWebsiteDesign(identities.global, styles.global);
        if (alive && globals.saveDesign(global)) { await globals.session.flush?.(); if (alive) setReady(true); } else if (alive) throw new Error('Global Defaults could not be adopted. Your existing identity was preserved.');
      }
    })().catch(error => { if (alive) { setFailure(error instanceof Error ? error.message : 'Website settings could not be loaded.'); setReady(false); } });
    return () => { alive = false; };
  // The source signature governs hydration; peer adapters expose changing function identities.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, globals.session.writable, reloadEpoch]);
  const settingsWritable = ready && Boolean(globals.library?.websiteDesignDefaults) && !first.failure && !second.failure && !globals.session.error;
  const scopeReady = { global: settingsWritable && globals.session.writable, test: settingsWritable && first.writable, test2: settingsWritable && second.writable };
  // These rejections occur before the owner accepts a mutation. Retrying keeps
  // the original baseline; uncertain flush failures and conflicts stay blocked.
  const retryScope = (['global', 'test', 'test2'] as const).find(scope => failure === unavailableSettings[scope] || failure === reconnectingSettings[scope]);
  const retryRequested = retryScope && failure === reconnectingSettings[retryScope];
  const recoveringSave = failure === unconfirmedSave;
  const reviewingConflict = failure === siteSettingsConflict && !settingsConflict;
  const canRetrySave = Boolean(retryScope || recoveringSave || failure === WEBSITE_STYLE_VALIDATION_ERROR);
  const canResetAfterValidationFailure = settingsWritable && failure === WEBSITE_STYLE_VALIDATION_ERROR;
  const dispatch: Dispatch<IdentityAction> = action => { if (!settingsWritable || failure || ('site' in action && !scopeReady[action.site])) return; if (!dirty.current) base.current = sourceRef.current; dirty.current = true; generation.current++; rawIdentity(action); };
  const dispatchStyle: Dispatch<StyleAction> = action => { if (!settingsWritable || ('scope' in action && !scopeReady[action.scope]) || (failure && !(canResetAfterValidationFailure && action.type === "reset"))) return; if (canResetAfterValidationFailure && action.type === "reset" && (!dirty.current || pending.current)) return; if (canResetAfterValidationFailure && action.type === "reset") setFailure(''); if (!dirty.current) base.current = sourceRef.current; dirty.current = true; generation.current++; rawStyles(action.type === "reset" && action.scope === "global" ? { ...action, defaults: {} } : action); };
  useEffect(() => {
    if (canRetrySave && retryRequested && retryScope && scopeReady[retryScope] && dirty.current && !pending.current) { setFailure(''); return; }
    if (!ready || !dirty.current || pending.current || (failure && !recoveringSave && !reviewingConflict) || !globals.library) return;
    const timer = setTimeout(() => {
      pending.current = true;
      let savingScope: 'global' | 'test' | 'test2' = 'global';
      let submitted: WebsiteDesign | null = null;
      let resumeSave = false;
      void (async () => {
        const snapshot = current.current;
        const savedGeneration = generation.current;
        const pairs = await Promise.all((['global','test','test2'] as const).map(async scope => [scope, await serialiseWebsiteDesign(snapshot.history.present[scope], snapshot.stylesHistory.present[scope])] as const));
        const designs = Object.fromEntries(pairs) as Record<'global'|'test'|'test2', WebsiteDesign>;
        const baseline = base.current!;
        if (recoveringSave) {
          // Draft aggregates may already contain optimistic settings. Only the
          // owners' committed snapshots can confirm a timed-out save.
          const confirmed = {
            global: globals.confirmedWebsiteDesign(),
            test: first.snapshot ? testSiteCollection(first.snapshot.document).websiteDesign ?? baseline.test : undefined,
            test2: second.snapshot ? testSiteCollection(second.snapshot.document).websiteDesign ?? baseline.test2 : undefined,
          };
          if (uncertainSave) {
            if (sameDesign(confirmed[uncertainSave.scope], uncertainSave.submitted)) {
              // Confirm the write that actually timed out, then drain any newer
              // edits or other scopes through the normal merge/save path.
              base.current = { ...base.current!, [uncertainSave.scope]: uncertainSave.submitted };
              resumeSave = true; setFailure('');
            }
            return;
          }
          if (generation.current === savedGeneration && (['global', 'test', 'test2'] as const).every(scope => sameDesign(confirmed[scope], designs[scope]))) {
            dirty.current = false; base.current = designs; accepted.current = JSON.stringify(designs);
            setFailure(''); setStatus('Website settings saved locally.');
          }
          return;
        }
        const savedDesigns = { ...designs };
        const global = mergeWebsiteDesign(baseline.global, designs.global, globals.confirmedWebsiteDesign() ?? sourceRef.current!.global);
        if (!sameDesign(global, sourceRef.current!.global)) {
          if (!globals.saveDesign(global)) throw new Error(unavailableSettings.global);
          submitted = global;
          await globals.session.flush?.();
          if (!sameDesign(globals.confirmedWebsiteDesign(), global)) throw new Error(unconfirmedSave);
        }
        submitted = null;
        savedDesigns.global = global;
        base.current = { ...base.current!, global };
        for (const [scope, site] of [['test',first],['test2',second]] as const) {
          savingScope = scope;
          const saved = site.snapshot ? testSiteCollection(site.snapshot.document).websiteDesign ?? baseline[scope] : sourceRef.current![scope];
          const merged = mergeWebsiteDesign(baseline[scope], designs[scope], saved);
          savedDesigns[scope] = merged;
          if (sameDesign(merged, sourceRef.current![scope]) && sameDesign(merged, saved)) {
            base.current = { ...base.current!, [scope]: merged };
            continue;
          }
          if (!sameDesign(merged, sourceRef.current![scope]) && !site.updateDraft(document => {
            const source = testSiteCollection(document);
            const fresh = source.websiteDesign ?? baseline[scope];
            // The current aggregate can contain our earlier staged settings.
            // A change after this render must still pass the field conflict check.
            const next = sameDesign(fresh, sourceRef.current![scope]) ? merged : mergeWebsiteDesign(baseline[scope], designs[scope], fresh);
            savedDesigns[scope] = next;
            return { ...source, version: 13, websiteDesign: next, globalTemplates: source.globalTemplates ?? migrateGlobalTemplateBindings(source.templates,globals.library!,scope), publications: localSitePublicationSnapshots(source) };
          })) throw new Error(unavailableSettings[scope]);
          submitted = savedDesigns[scope];
          await site.flush();
          const confirmed = site.confirmedWebsiteDesign?.() ?? (site.snapshot ? testSiteCollection(site.snapshot.document).websiteDesign ?? baseline[scope] : undefined);
          if (!sameDesign(confirmed, savedDesigns[scope])) throw new Error(unconfirmedSave);
          submitted = null;
          base.current = { ...base.current!, [scope]: savedDesigns[scope] };
        }
        accepted.current = JSON.stringify(designs);
        if (generation.current === savedGeneration) dirty.current = false;
        base.current = savedDesigns;
        setFailure(''); setStatus('Website settings saved locally.');
      })().catch(error => { setFailure(error instanceof WebsiteDesignConflictError ? { message: error.message, scope: savingScope, conflict: error } : error instanceof Error && error.message === unconfirmedSave && submitted ? { message: error.message, scope: savingScope, submitted } : error instanceof Error ? error.message : 'Website settings could not be saved. Your draft was preserved.'); }).finally(() => { pending.current = false; if (resumeSave || !recoveringSave && !reviewingConflict) setSaveEpoch(epoch=>epoch+1); });
      if (!recoveringSave) setStatus('Saving website settings…');
    }, 300);
    return () => clearTimeout(timer);
  // Snapshot/generation guard is the save dependency; adapters are read at dispatch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, stylesHistory, ready, failure, saveEpoch, globals.library, globals.session.writable, first.writable, second.writable, first.snapshot, second.snapshot]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty.current || pending.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload',guard);
  }, []);
  async function resolveSettingsConflict(choice: 'mine' | 'theirs') {
    if (!settingsConflict || pending.current || !base.current) return;
    const { scope, conflict } = settingsConflict;
    const site = scope === 'test' ? first : second;
    const saved = scope === 'global' ? globals.confirmedWebsiteDesign() : site.confirmedWebsiteDesign?.() ?? (site.snapshot ? testSiteCollection(site.snapshot.document).websiteDesign : undefined);
    if (!saved) throw new Error('Saved settings are unavailable. Reconnect before resolving this draft.');
    pending.current = true;
    const expectedGeneration = generation.current;
    try {
      const merged = mergeWebsiteDesign(conflict.base, conflict.draft, saved, choice);
      const hydrated = await hydrateWebsiteDesign(merged, src => `/__studio/site-media/${scope}/${src.slice(7)}`);
      if (generation.current !== expectedGeneration) return;
      rawIdentity({ type: 'hydrate', values: { ...current.current.history.present, [scope]: hydrated.identity } });
      rawStyles({ type: 'hydrate', values: { ...current.current.stylesHistory.present, [scope]: hydrated.styles } });
      base.current = { ...base.current, [scope]: saved };
      dirty.current = true; generation.current++; setFailure('');
    } finally { pending.current = false; setSaveEpoch(epoch=>epoch+1); }
  }
  return { settingsConflict, resolveSettingsConflict, history, dispatch, stylesHistory, dispatchStyle, ready: settingsWritable, scopeReady, canRetrySave, retrySave() { if (!canRetrySave || !dirty.current || pending.current) return; if (failure === WEBSITE_STYLE_VALIDATION_ERROR) { setFailure(''); setSaveEpoch(epoch=>epoch+1); return; } if (retryScope) setFailure(reconnectingSettings[retryScope]); sessions.browser.retryEditing(); if (recoveringSave) globals.reconnectSaving(); else globals.session.retryConnection(); void first.reconnect(); void second.reconnect(); setSaveEpoch(epoch=>epoch+1); }, canResetAfterValidationFailure, startup: settingsWritable ? null : startup, status: failure || first.failure || second.failure || globals.session.error || status, failure, flush: async () => { for (let attempt = 0; attempt < 200 && (dirty.current || pending.current); attempt++) await new Promise(resolve=>setTimeout(resolve,50)); if (dirty.current || pending.current) throw new Error('Website settings could not finish saving. Your draft was preserved.'); }, retry() { if ((dirty.current || pending.current) && !window.confirm('Reload saved website settings and discard this unsaved settings draft?')) return; dirty.current = false; base.current = null; setReady(false); setFailure(''); accepted.current = ''; setReloadEpoch(epoch=>epoch+1); globals.session.retryConnection(); void first.reconnect(); void second.reconnect(); } };
}
