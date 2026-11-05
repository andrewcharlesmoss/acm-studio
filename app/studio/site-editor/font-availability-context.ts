"use client";
import { createContext, useContext } from "react";
import type { StyleSelection } from "./styles-preview-state";

/** Supplies font availability without projecting website presentation into content. */
export const WebsiteFontAvailabilityContext = createContext<StyleSelection | null>(null);
export const useWebsiteFontAvailability = () => useContext(WebsiteFontAvailabilityContext);
