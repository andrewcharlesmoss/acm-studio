"use client";
import { readWebsiteDesignStartup } from "./website-design-startup-cache";
import { useEffect, useLayoutEffect, useReducer, useSyncExternalStore, useRef, useState, useMemo, type Dispatch } from "react";
import { testSiteCollection } from "../test-site/contract";
import { localSitePublicationSnapshots } from "../test-site/local-publication";
import { migrateGlobalTemplateBindings } from "../global-template-contract";
import { createIdentityStore } from "./identity-repository";
import { createIdentityPreview, identityPreviewReducer, type IdentityAction, type IdentityValues } from "./identity-preview-state";
import { createStylesPreview, stylesPreviewReducer, type StyleAction, type StyleValues } from "./styles-preview-state";
import { hydrateWebsiteDesign, legacyWebsiteDefaults, serialiseWebsiteDesign, type WebsiteDesign } from "./website-design";
import { WEBSITE_STYLE_VALIDATION_ERROR } from "./website-style-validation";
import type { SiteEditorSessions } from "./use-site-editor-sessions";

/** Settings use the existing site/global peers; only the global writer reaches disk. */
export function useWebsiteDesign(sessions: SiteEditorSessions) {
  const { test: first, test2: second, globals } = sessions;
  const [history, rawIdentity] = useReducer(identityPreviewReducer, undefined, createIdentityPreview);
  const [stylesHistory, rawStyles] = useReducer(stylesPreviewReducer, undefined, createStylesPreview);
  const cached = useMemo(()=>readWebsiteDesignStartup(),[]);
  const startup = useSyncExternalStore(()=>()=>{},()=>cached,()=>null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Loading saved website settings…');
  const [failure, setFailure] = useState('');
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
  const canResetAfterValidationFailure = settingsWritable && failure === WEBSITE_STYLE_VALIDATION_ERROR && dirty.current && !pending.current;
  const dispatch: Dispatch<IdentityAction> = action => { if (!settingsWritable || failure) return; if (!dirty.current) base.current = sourceRef.current; dirty.current = true; generation.current++; rawIdentity(action); };
  const dispatchStyle: Dispatch<StyleAction> = action => { if (!settingsWritable || (failure && !(canResetAfterValidationFailure && action.type === "reset"))) return; if (canResetAfterValidationFailure && action.type === "reset") setFailure(''); if (!dirty.current) base.current = sourceRef.current; dirty.current = true; generation.current++; rawStyles(action.type === "reset" && action.scope === "global" ? { ...action, defaults: {} } : action); };
  useEffect(() => {
    if (!ready || !dirty.current || pending.current || failure || !globals.library) return;
    const timer = setTimeout(() => {
      pending.current = true;
      void (async () => {
        const snapshot = current.current;
        const savedGeneration = generation.current;
        const pairs = await Promise.all((['global','test','test2'] as const).map(async scope => [scope, await serialiseWebsiteDesign(snapshot.history.present[scope], snapshot.stylesHistory.present[scope])] as const));
        const designs = Object.fromEntries(pairs) as Record<'global'|'test'|'test2', WebsiteDesign>;
        const baseline = base.current!;
        if (JSON.stringify(sourceRef.current!.global) !== JSON.stringify(baseline.global)) throw new Error("Global Defaults changed while you were editing. Your draft was preserved; reload after reviewing the other change.");
        if (JSON.stringify(designs.global) !== JSON.stringify(baseline.global)) {
          if (!globals.saveDesign(designs.global)) throw new Error('Global settings cannot be saved yet. Your draft was preserved.');
          await globals.session.flush?.();
        }
        for (const [scope, site] of [['test',first],['test2',second]] as const) {
          if (JSON.stringify(designs[scope]) === JSON.stringify(baseline[scope])) continue;
          if (!site.updateDraft(document => {
            const source = testSiteCollection(document);
            const fresh = source.websiteDesign ?? baseline[scope];
            if (JSON.stringify(fresh) !== JSON.stringify(baseline[scope])) throw new Error("This site’s settings changed while you were editing. Your draft was preserved.");
            const global = globals.library!;
            return { ...source, version: 12, websiteDesign: designs[scope], globalTemplates: source.globalTemplates ?? migrateGlobalTemplateBindings(source.templates,global,scope), publications: localSitePublicationSnapshots(source) };
          })) throw new Error(`${scope === 'test' ? 'Test' : 'Test2'} settings cannot be saved. Your draft was preserved.`);
          await site.flush();
        }
        accepted.current = JSON.stringify(designs);
        if (generation.current === savedGeneration) dirty.current = false;
        base.current = designs;
        setStatus('Website settings saved locally.');
      })().catch(error => { setFailure(error instanceof Error ? error.message : 'Website settings could not be saved. Your draft was preserved.'); }).finally(() => { pending.current = false; setSaveEpoch(epoch=>epoch+1); });
      setStatus('Saving website settings…');
    }, 300);
    return () => clearTimeout(timer);
  // Snapshot/generation guard is the save dependency; adapters are read at dispatch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, stylesHistory, ready, failure, saveEpoch, globals.library, globals.session.writable, first.writable, second.writable]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty.current || pending.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload',guard);
  }, []);
  return { history, dispatch, stylesHistory, dispatchStyle, ready: settingsWritable, canResetAfterValidationFailure, startup: settingsWritable ? null : startup, status: failure || first.failure || second.failure || globals.session.error || status, failure, flush: async () => { for (let attempt = 0; attempt < 200 && (dirty.current || pending.current); attempt++) await new Promise(resolve=>setTimeout(resolve,50)); if (dirty.current || pending.current) throw new Error('Website settings could not finish saving. Your draft was preserved.'); }, retry() { if ((dirty.current || pending.current) && !window.confirm('Reload saved website settings and discard this unsaved settings draft?')) return; dirty.current = false; base.current = null; setReady(false); setFailure(''); accepted.current = ''; setReloadEpoch(epoch=>epoch+1); globals.session.retryConnection(); void first.reconnect(); void second.reconnect(); } };
}
