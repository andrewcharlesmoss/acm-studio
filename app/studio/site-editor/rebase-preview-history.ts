import type { PreviewScope } from "./identity-preview-state";

/** Retain other scopes' Undo entries while replacing a scope with its confirmed merged value. */
export function rebasePreviewHistory<T extends Record<PreviewScope, unknown>, H extends { past: T[]; present: T; future: T[] }>(history: H, scope: PreviewScope, value: T[PreviewScope]): H {
  const replace = (entry: T): T => ({ ...entry, [scope]: value });
  const equal = (first: T, second: T) => (['global', 'test', 'test2'] as const).every(key => Object.is(first[key], second[key]));
  const present = replace(history.present);
  const past: T[] = [];
  for (const entry of history.past.map(replace)) if (!past.length || !equal(past[past.length - 1], entry)) past.push(entry);
  while (past.length && equal(past[past.length - 1], present)) past.pop();
  const future: T[] = [];
  let previous = present;
  for (const entry of history.future.map(replace)) if (!equal(previous, entry)) { future.push(entry); previous = entry; }
  return { ...history, past, present, future };
}
