import { createContext } from "react";

export type FocusMode = "on" | "off" | "keyboard";
export type FocusPreference = { mode: FocusMode; setMode: (mode: FocusMode) => void; status: string };

// Keep identity outside the component boundary: the development RSC loader
// and HMR may load that boundary through different module URLs.
export const FocusPreferenceContext = createContext<FocusPreference | null>(null);
