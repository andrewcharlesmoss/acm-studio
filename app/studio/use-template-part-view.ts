"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createTemplatePartViewRepository } from "./template-part-view-repository.mjs";

type PartKind = "header" | "footer";
type CanvasView = "full" | "fit";
const partKinds: PartKind[] = ["header", "footer"];
type Repository = ReturnType<typeof createTemplatePartViewRepository>;

export function useTemplatePartView() {
  const [views, setViews] = useState<Record<PartKind, CanvasView>>({ header: "full", footer: "full" });
  const [statuses, setStatuses] = useState<Record<PartKind, string>>({ header: "", footer: "" });
  const repositories = useRef<Partial<Record<PartKind, Repository>>>({});
  const generations = useRef({ header: 0, footer: 0 });
  useLayoutEffect(() => {
    let active = true;
    const counters = generations.current;
    try {
      const next = Object.fromEntries(partKinds.map(kind => {
        const repository = createTemplatePartViewRepository({ kind, storage: window.localStorage });
        repositories.current[kind] = repository;
        return [kind, repository.read()];
      })) as Record<PartKind, CanvasView>;
      queueMicrotask(() => { if (active) setViews(next); });
    } catch {
      queueMicrotask(() => { if (active) setStatuses({ header: "Applies to this page; this browser cannot save the preference.", footer: "Applies to this page; this browser cannot save the preference." }); });
    }
    return () => {
      active = false;
      counters.header++;
      counters.footer++;
      repositories.current = {};
    };
  }, []);
  function setView(kind: PartKind, next: CanvasView) {
    if (next !== "full" && next !== "fit") return;
    setViews(current => ({ ...current, [kind]: next }));
    const generation = ++generations.current[kind];
    setStatuses(current => ({ ...current, [kind]: "" }));
    const repository = repositories.current[kind];
    if (!repository) {
      setStatuses(current => ({ ...current, [kind]: "Applies to this page; this browser cannot save the preference." }));
      return;
    }
    void repository.save(next).then(result => {
      if (generation !== generations.current[kind] || result.saved) return;
      setStatuses(current => ({ ...current, [kind]: result.reason === "blocked"
        ? "Applies to this page; another Studio tab prevents saving."
        : "Applies to this page; this browser cannot save the preference." }));
    });
  }
  return { views, statuses, setView };
}
