import { applyStudioTransaction, createStudioTransaction, type StudioSyncConflict, type StudioSyncTransaction } from "./studio-sync";

export type StudioPendingSave<T> = { base: T; snapshot: T };

/** Rebase only unsaved work. An accepted local operation is already part of the base. */
export function reconcileStudioPendingSave<T>(
  pending: StudioPendingSave<T> | null,
  authoritative: T,
  validate: (value: unknown) => T,
  reason: string,
  acknowledgedTransaction?: StudioSyncTransaction,
): { snapshot: T; pending: StudioPendingSave<T> | null; conflict: StudioSyncConflict | null } {
  if (!pending) return { snapshot: authoritative, pending: null, conflict: null };
  let base = pending.base;
  if (acknowledgedTransaction) {
    const accepted = applyStudioTransaction(base, acknowledgedTransaction);
    if (!accepted.conflicts.length) base = validate(accepted.snapshot);
  }
  const transaction = createStudioTransaction(base, pending.snapshot, {
    transactionId: "pending-save", clientId: "local-peer", brokerEpoch: "handover", baseRevision: 0,
  });
  const merged = applyStudioTransaction(authoritative, transaction);
  if (merged.conflicts.length) {
    return {
      snapshot: pending.snapshot,
      pending: { base, snapshot: pending.snapshot },
      conflict: { transaction, conflicts: merged.conflicts, baseSnapshot: base, remoteSnapshot: authoritative, localSnapshot: pending.snapshot, reason },
    };
  }
  const snapshot = validate(merged.snapshot);
  const remaining = createStudioTransaction(authoritative, snapshot, transaction);
  return { snapshot, pending: remaining.changes.length ? { base: authoritative, snapshot } : null, conflict: null };
}
