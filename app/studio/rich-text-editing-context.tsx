"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CaretFormatSnapshot } from "./caret-formatting-command";

type MathSelection = (editor: HTMLElement, selection: { start: number; end: number }, explicit?: boolean) => void;
type CaretFormatsChange = (editor: HTMLElement, snapshot: CaretFormatSnapshot | null) => void;
const RichTextEditingContext = createContext<{ writable: boolean; onMathActivate?: MathSelection; onImageActivate?: MathSelection; onFeedback?: (message: string) => void; onCaretFormatsChange?: CaretFormatsChange }>({ writable: true });

/** Canvas ownership applies to every rich field, including presentation adapters. */
export function RichTextEditingProvider({ writable, children, onMathActivate, onImageActivate, onFeedback, onCaretFormatsChange }: { writable: boolean; children: ReactNode; onMathActivate?: MathSelection; onImageActivate?: MathSelection; onFeedback?: (message: string) => void; onCaretFormatsChange?: CaretFormatsChange }) {
  return <RichTextEditingContext.Provider value={{ writable, onMathActivate, onImageActivate, onFeedback, onCaretFormatsChange }}>{children}</RichTextEditingContext.Provider>;
}

export function useRichTextEditing(contentEditable?: boolean | "true" | "false" | "inherit" | "plaintext-only") {
  return useContext(RichTextEditingContext).writable && contentEditable !== false && contentEditable !== "false";
}

export const useMathActivation = () => useContext(RichTextEditingContext).onMathActivate;
export const useImageActivation = () => useContext(RichTextEditingContext).onImageActivate;
export const useRichTextFeedback = () => useContext(RichTextEditingContext).onFeedback;
export const useCaretFormatsChange = () => useContext(RichTextEditingContext).onCaretFormatsChange;
