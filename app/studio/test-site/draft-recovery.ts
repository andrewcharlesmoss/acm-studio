import type { TestSiteDocument } from "./contract";

/** A proposal may replace only the exact saved document that it was based on. */
export function canApplyTestProposal(baseline: { revision: string; document: TestSiteDocument }, current: { snapshot: { revision: string } | null; draft: TestSiteDocument | null; failure: string | null }) {
  return !current.failure && current.snapshot?.revision === baseline.revision && JSON.stringify(current.draft) === JSON.stringify(baseline.document);
}

export function testDraftRecoveryEnvelope(draft: TestSiteDocument | null, baseRevision: string | undefined, preservedProposal: unknown) {
  return { draft, baseRevision, preservedProposal };
}
