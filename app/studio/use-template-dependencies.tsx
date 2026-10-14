"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { TemplateDependencyDialog } from "./template-dependency-dialog";
import { changeTemplateDependencies, collectGlobalTemplateDependencies, dependencyBindings, dependencyOwnerName, type TemplateDependency, type TemplateDependencySnapshot, type TemplateDependencyTarget } from "./template-dependencies";
import { changeFixtureTemplateDependencies, fixtureTemplateDependencySnapshot } from "./test-site/template-dependencies";
import { moveGlobalTemplateToBin } from "./global-template-bin";
import type { useStudioWorkspace } from "./use-studio-workspace";
import type { useTemplates } from "./use-templates";
import type { useGlobalTemplates } from "./use-global-templates";
import type { useTestSite } from "./test-site/use-test-site";

export function useTemplateDependencySelection() { return useState<TemplateDependencyTarget | null>(null); }
export function useTemplateDependencies({ target, onTargetChange, globals, browser, browserTemplates, firstSite, secondSite, beforeOpen, onOpenTemplate }: {
  target: TemplateDependencyTarget | null; onTargetChange: (target: TemplateDependencyTarget | null) => void;
  globals: ReturnType<typeof useGlobalTemplates>; browser: ReturnType<typeof useStudioWorkspace>; browserTemplates: ReturnType<typeof useTemplates>;
  firstSite: ReturnType<typeof useTestSite>; secondSite: ReturnType<typeof useTestSite>;
  beforeOpen: () => Promise<boolean>; onOpenTemplate: (setId: string, entryId: string) => void;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const latest = useRef({ globals, browser, browserTemplates, firstSite, secondSite });
  useLayoutEffect(() => { latest.current = { globals, browser, browserTemplates, firstSite, secondSite }; }, [globals, browser, browserTemplates, firstSite, secondSite]);
  function sources(input: typeof latest.current): TemplateDependencySnapshot[] {
    const { globals, browser, browserTemplates, firstSite, secondSite } = input;
    if (!globals.library || !globals.initialised || !browser.ready || !browserTemplates.ready || !firstSite.draft || !secondSite.draft) throw new Error("Loading current dependencies from Studio Drafts, Test and Test2…");
    if (browser.loadError || browserTemplates.error || firstSite.failure || secondSite.failure || globals.session.error) throw new Error("A source needs attention. Reconnect it before changing dependencies.");
    return [{ owner: "drafts", workspace: browser.workspace, templates: browserTemplates.store, bindings: dependencyBindings("drafts", browserTemplates.store, globals.library) }, fixtureTemplateDependencySnapshot(firstSite.draft, globals.library), fixtureTemplateDependencySnapshot(secondSite.draft, globals.library)];
  }
  let unavailable: string | undefined; let snapshots: TemplateDependencySnapshot[] = [];
  try { snapshots = sources({ globals, browser, browserTemplates, firstSite, secondSite }); } catch (error) { unavailable = error instanceof Error ? error.message : "Dependencies are unavailable."; }
  function rowsFor(next: TemplateDependencyTarget) { return globals.library ? collectGlobalTemplateDependencies(globals.library, next, snapshots) : []; }
  function reason(next: TemplateDependencyTarget) {
    if (unavailable) return unavailable;
    const blocking = rowsFor(next).filter(row => row.blocking);
    return blocking.length ? `${blocking.length} ${blocking.length === 1 ? "dependency remains" : "dependencies remain"}. Use Manage dependencies.` : undefined;
  }
  function manage(next: TemplateDependencyTarget) {
    requestAnimationFrame(() => { void beforeOpen().then(accepted => { if (accepted) { opener.current = document.activeElement as HTMLElement; onTargetChange(next); } }); });
  }
  async function move(next: TemplateDependencyTarget) {
    try {
      if (!await beforeOpen()) return;
      const current = latest.current;
      if (!current.globals.library) throw new Error("Global templates are unavailable.");
      if (collectGlobalTemplateDependencies(current.globals.library, next, sources(latest.current)).some(row => row.blocking)) throw new Error("Dependencies remain. Use Manage dependencies before moving this template.");
      const session = current.globals.session;
      if (!session.commit(store => moveGlobalTemplateToBin(store, next))) throw new Error("The template could not be moved. Its original was kept.");
      await session.flush?.(); setFeedback("Template moved to the global Bin. Undo or Restore brings it back.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "The move could not be confirmed. Your draft was kept."); }
  }
  async function apply(selected: TemplateDependency[], replacement: TemplateDependencyTarget | null, report: (message: string) => void) {
    if (!target) throw new Error("Choose a template.");
    for (const owner of ["drafts", "test", "test2"] as const) {
      const items = selected.filter(item => item.owner === owner); if (!items.length) continue;
      const current = latest.current;
      try {
        if (owner === "drafts") {
          if (!current.browser.writable || !current.browserTemplates.writable || !current.browserTemplates.flush) throw new Error("Studio Drafts saving is unavailable.");
          await current.browser.flush(); await current.browserTemplates.flush();
          // Prepare metadata first. A rejected assignment save leaves the old
          // layout intact and is reported, rather than rolling back foreign edits.
          let preparedSource: TemplateDependencySnapshot | undefined;
          if (!current.browser.commit(workspace => {
            const source = sources(latest.current).find(item => item.owner === owner)!;
            preparedSource = { ...source, workspace };
            return changeTemplateDependencies(preparedSource, latest.current.globals.library!, target, items, replacement).workspace;
          })) throw new Error("Studio Drafts metadata could not be saved.");
          await current.browser.flush();
          if (!current.browserTemplates.commit(templates => {
            const source = preparedSource!;
            return changeTemplateDependencies({ ...source, templates }, latest.current.globals.library!, target, items, replacement).templates;
          })) throw new Error("Metadata was prepared, but template assignments were not saved. Review Studio Drafts before retrying.");
          await current.browserTemplates.flush();
        } else {
          const site = owner === "test" ? current.firstSite : current.secondSite;
          if (!site.writable) throw new Error(`${dependencyOwnerName(owner)} saving is unavailable.`);
          await site.flush();
          if (!site.updateDraft(document => changeFixtureTemplateDependencies(document, latest.current.globals.library!, target, items, replacement))) throw new Error("The assignment change was not accepted. Refresh dependencies.");
          await site.flush();
        }
        report(`${dependencyOwnerName(owner)}: saved ${items.length} ${items.length === 1 ? "assignment" : "assignments"}.`);
      } catch (error) { throw new Error(`${dependencyOwnerName(owner)}: ${error instanceof Error ? error.message : "Saving failed."} Earlier completed saves were kept; remaining owners were not changed.`); }
    }
  }
  const entry = target && globals.library?.templates.sets.find(set => set.id === target.setId);
  const name = entry && [...entry.templates, ...entry.parts].find(item => item.id === target!.entryId)?.name;
  const dialog = target && globals.library ? <TemplateDependencyDialog key={`${target.setId}/${target.entryId}`} name={name ?? "Template"} target={target} store={globals.session.store} rows={rowsFor(target)} unavailable={unavailable} onApply={apply} opener={opener} onClose={() => onTargetChange(null)} onOpenReference={key => { const id = key.slice("global:part:".length); const [setId, entryId] = id.split("/"); onTargetChange(null); onOpenTemplate(setId, entryId); }} /> : null;
  return { dialog, feedback, manage, move, reason };
}
