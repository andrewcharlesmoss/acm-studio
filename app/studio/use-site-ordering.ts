"use client";
import { useEffect, useRef, useState } from "react";
import { createSiteOrderRepository, orderedSiteIds, siteOrderPreferenceKey } from "./site-order-repository.mjs";
import { movedLibraryIds } from "./library-reordering";
import type { DropEdgeAlignment } from "./drop-gap-geometry";
import { useLibraryReordering } from "./use-library-reordering";

/** Sidebar order is an interface preference; site identity and environments stay together. */
export function useNavigationOrdering(ids: string[], preferenceKey = siteOrderPreferenceKey, label = "Site order", listKey = "sites", edgeAlignment: DropEdgeAlignment = "boundary") {
  const [order, setOrder] = useState(ids);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const repository = useRef<ReturnType<typeof createSiteOrderRepository> | null>(null);
  const savedOrder = useRef(ids);
  const generation = useRef(0);
  const activeOrder = orderedSiteIds(ids, order);
  const idsKey = JSON.stringify(ids);
  useEffect(() => {
    let active = true;
    const generationCounter = generation;
    generationCounter.current++;
    try {
      const current = createSiteOrderRepository({ storage: window.localStorage, ids: JSON.parse(idsKey), key: preferenceKey });
      repository.current = current;
      savedOrder.current = current.read();
      queueMicrotask(() => { if (active) { setOrder(current.read()); setSaving(false); } });
    } catch { queueMicrotask(() => { if (active) setStatus(`${label} applies to this page; saving is unavailable.`); }); }
    const refresh = (event: StorageEvent) => {
      if (event.key !== preferenceKey || !repository.current) return;
      const next = repository.current.read(); savedOrder.current = next; setOrder(next); setStatus("");
    };
    window.addEventListener("storage", refresh);
    return () => { active = false; generationCounter.current++; repository.current = null; window.removeEventListener("storage", refresh); };
  }, [idsKey, preferenceKey, label]);
  const reordering = useLibraryReordering(activeOrder, !saving, move => {
    const next = movedLibraryIds(activeOrder, move);
    if (!next) return false;
    setOrder(next); setStatus("");
    const current = repository.current;
    if (!current) { setStatus(`${label} applies to this page; saving is unavailable.`); return true; }
    setSaving(true);
    const attempt = generation.current;
    void current.save(next, savedOrder.current).then(result => {
      if (attempt !== generation.current) return;
      if (result.saved) savedOrder.current = next;
      else setStatus(result.reason === "blocked" ? `${label} applies to this page; another Studio tab prevents saving.` : `${label} was not saved. Refresh before trying again.`);
    }).finally(() => { if (attempt === generation.current) setSaving(false); });
    return true;
  }, listKey, edgeAlignment);
  return { order: activeOrder, reordering, status };
}

export function useSiteOrdering(ids: string[]) { return useNavigationOrdering(ids); }
