"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ContentBlock } from "../content/model";
import { visibleFootnoteNumbers } from "../content/footnote-blocks";

const FootnoteNumbersContext = createContext(new Map<string, number>());

export function FootnoteNumbersProvider({ blocks, children }: { blocks: ContentBlock[]; children: ReactNode }) {
  const numbers = useMemo(() => visibleFootnoteNumbers(blocks), [blocks]);
  return <FootnoteNumbersContext.Provider value={numbers}>{children}</FootnoteNumbersContext.Provider>;
}

export function useFootnoteNumbers() {
  return useContext(FootnoteNumbersContext);
}
