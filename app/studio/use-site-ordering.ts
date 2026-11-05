"use client";
import { dashboardOrderKeys } from "./dashboard-order-contract.mjs";
import { saveStudioPreferenceThroughOwner } from "./studio-preference-broker.mjs";
import { useEffect, useRef, useState } from "react";
import { createSiteOrderRepository, orderedSiteIds, siteOrderPreferenceKey } from "./site-order-repository.mjs";
import { movedLibraryIds } from "./library-reordering";
import type { DropAxis, DropEdgeAlignment, WrappedRowBoundaryCue } from "./drop-gap-geometry";
import { useLibraryReordering } from "./use-library-reordering";

// Keep the last loaded preference available when a route remounts the shared
// navigation before its localStorage effect runs again.
const navigationOrderCache = new Map<string, { order: string[]; locallyChanged: boolean }>();

const retainSiteOrder = (order: string[]) => order;

/** Sidebar order is an interface preference; site identity and environments stay together. */
export function useNavigationOrdering(ids: string[], preferenceKey = siteOrderPreferenceKey, label = "Site order", listKey = "sites", edgeAlignment: DropEdgeAlignment = "boundary", normaliseOrder: (order: string[]) => string[] = retainSiteOrder, axis: DropAxis = "y", wrappedRowBoundaryCue: WrappedRowBoundaryCue = "full-row") {
  const [order, setOrder] = useState(() => navigationOrderCache.get(preferenceKey)?.order ?? ids);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const repository = useRef<ReturnType<typeof createSiteOrderRepository> | null>(null);
  const savedOrder = useRef(ids);
  const generation = useRef(0);
  const activeOrder = orderedSiteIds(ids, order, normaliseOrder);
  const idsKey = JSON.stringify(ids);
  useEffect(() => {
    let active = true;
    const generationCounter = generation;
    generationCounter.current++;
    try {
      const current = createSiteOrderRepository({ storage: window.localStorage, ids: JSON.parse(idsKey), key: preferenceKey, normaliseOrder });
      repository.current = current;
      const nextOrder = current.read();
      savedOrder.current = nextOrder;
      const cached = navigationOrderCache.get(preferenceKey);
      if (!cached?.locallyChanged) navigationOrderCache.set(preferenceKey, { order: nextOrder, locallyChanged: false });
      queueMicrotask(() => { if (active) { setOrder(cached?.locallyChanged ? cached.order : nextOrder); setSaving(false); setReady(true); } });
    } catch { queueMicrotask(() => { if (active) { setStatus(`${label} applies to this page; saving is unavailable.`); setReady(true); } }); }
    const refresh = (event: StorageEvent) => {
      if (event.key !== preferenceKey || !repository.current) return;
      const next = repository.current.read(); savedOrder.current = next; navigationOrderCache.set(preferenceKey, { order: next, locallyChanged: false }); setOrder(next); setStatus("");
    };
    window.addEventListener("storage", refresh);
    return () => { active = false; generationCounter.current++; repository.current = null; window.removeEventListener("storage", refresh); };
  }, [idsKey, preferenceKey, label, normaliseOrder]);
  const reordering = useLibraryReordering(activeOrder, !saving, move => {
    const next = movedLibraryIds(activeOrder, move);
    if (!next) return false;
    navigationOrderCache.set(preferenceKey, { order: next, locallyChanged: true });
    setOrder(next); setStatus("");
    const current = repository.current;
    if (!current) { setStatus(`${label} applies to this page; saving is unavailable.`); return true; }
    setSaving(true);
    const attempt = generation.current;
    const baseline = [...savedOrder.current];
    const brokerPreference = preferenceKey === dashboardOrderKeys.sites ? "dashboardSites" : preferenceKey === dashboardOrderKeys.tools ? "dashboardTools" : null;
    void current.save(next, baseline).then(async result => {
      if (!result.saved && result.reason === "blocked" && brokerPreference) return saveStudioPreferenceThroughOwner(brokerPreference, JSON.stringify({ order: next, baseline }));
      return result;
    }).then(result => {
      if (result.saved) {
        savedOrder.current = next;
        const cached = navigationOrderCache.get(preferenceKey);
        if (cached && JSON.stringify(cached.order) === JSON.stringify(next)) navigationOrderCache.set(preferenceKey, { order: next, locallyChanged: false });
      }
      if (attempt !== generation.current || result.saved) return;
      setStatus(result.reason === "blocked" ? `${label} applies to this page; another Studio tab prevents saving.` : `${label} was not saved. Refresh before trying again.`);
    }).finally(() => { if (attempt === generation.current) setSaving(false); });
    return true;
  }, listKey, edgeAlignment, axis, wrappedRowBoundaryCue);
  return { order: activeOrder, reordering, status, ready };
}

export function useSiteOrdering(ids: string[]) { return useNavigationOrdering(ids); }
