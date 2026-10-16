import { startStudioPreferenceHost, saveStudioPreferenceThroughOwner } from "./studio-preference-broker.mjs";

// Compatibility entry points for the shared Studio preference runtime.
export const startSitesDisclosureHost = startStudioPreferenceHost;
export const saveSitesDisclosureThroughOwner = mode => saveStudioPreferenceThroughOwner("sites", mode);
