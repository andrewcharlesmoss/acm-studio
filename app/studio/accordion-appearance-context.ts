import { createContext } from "react";

export const DEFAULT_ACCORDION_HOVER = "#F0F0F0";
export const AccordionAppearanceContext = createContext<{
  colour: string;
  setColour: (colour: string) => void;
  status: string;
} | null>(null);
