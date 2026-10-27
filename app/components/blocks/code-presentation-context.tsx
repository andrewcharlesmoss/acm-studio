"use client";
import { createContext, useContext, type CSSProperties } from "react";

export const CodePresentationContext = createContext<CSSProperties | undefined>(undefined);
export function useCodePresentation() { return useContext(CodePresentationContext); }
