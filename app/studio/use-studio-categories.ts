"use client";
import { useMemo } from "react";
import type { StudioDocument, StudioWorkspace, StudioCategory } from "./editor-model";
import type { CommitWorkspace } from "./use-studio-document-commands";

/** Document taxonomy commands use the supplied history-wrapped commit. */
export function useStudioCategories({ workspace, activeDocument, commit }: {
  workspace: StudioWorkspace; activeDocument: StudioDocument; commit: CommitWorkspace;
}) {
  const tagSuggestions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const post of workspace.documents.filter(item => item.kind === "post")) {
      for (const tag of post.tags) {
        const key = tag.trim().toLocaleLowerCase("en-GB");
        if (!key) continue;
        const previous = counts.get(key);
        counts.set(key, { label: previous?.label ?? tag.trim(), count: (previous?.count ?? 0) + 1 });
      }
    }
    return [...counts.values()].sort((first, second) => second.count - first.count || first.label.localeCompare(second.label, "en-GB")).slice(0, 16).map(item => item.label);
  }, [workspace.documents]);
  function selectCategories(categoryIds: string[]) {
              const primaryCategory = workspace.categories.find(category => category.id === categoryIds[0]);
              commit(current => ({ ...current, documents: current.documents.map(item => item.id === activeDocument.id ? { ...item, categoryIds, category: primaryCategory?.name, templateOverrides: { ...item.templateOverrides, category: true } } : item) }));
  }
  function addCategory(name: string, parentId?: string) {
              const existing = workspace.categories.find(category => category.name.toLocaleLowerCase("en-GB") === name.toLocaleLowerCase("en-GB") && (category.parentId || "") === (parentId || ""));
              const category: StudioCategory = existing ?? { id: `category-${crypto.randomUUID()}`, name, ...(parentId ? { parentId } : {}) };
              commit(current => ({
                ...current,
                categories: existing ? current.categories : [...current.categories, category],
                documents: current.documents.map(item => {
                  if (item.id !== activeDocument.id) return item;
                  const previousIds = item.categoryIds ?? (item.category ? current.categories.filter(term => term.name.toLocaleLowerCase("en-GB") === item.category?.trim().toLocaleLowerCase("en-GB")).map(term => term.id) : []);
                  const categoryIds = previousIds.includes(category.id) ? previousIds : [...previousIds, category.id];
                  const primaryCategory = current.categories.find(term => term.id === categoryIds[0]) ?? category;
                  return { ...item, categoryIds, category: primaryCategory.name, templateOverrides: { ...item.templateOverrides, category: true } };
                }),
              }));
  }
  return { tagSuggestions, selectCategories, addCategory };
}
