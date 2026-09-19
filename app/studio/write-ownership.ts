export type OwnershipState = "unavailable" | "waiting" | "loading" | "writable" | "unreadable" | "restoring" | "blocked";
export type RestorePermit = { readonly token: symbol };
type LockManagerLike = Pick<LockManager, "request">;

// One coordinator per browser tab. The Web Lock covers the whole local Studio,
// including media and publication stores, rather than individual save calls.
export class StudioWriteOwnership {
  private state: OwnershipState = "waiting";
  private owner: symbol | null = null;
  private releaseLock: (() => void) | null = null;
  private pending = new Set<Promise<unknown>>();
  private restorePermit: RestorePermit | null = null;
  private listeners = new Set<() => void>();

  getState = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private notify(state: OwnershipState) { this.state = state; this.listeners.forEach((listener) => listener()); }

  acquire(onLoad: (token: symbol) => void, locks: LockManagerLike | undefined = globalThis.navigator?.locks) {
    let cancelled = false;
    let token: symbol | null = null;
    if (!locks) this.notify("unavailable");
    else {
      this.notify("waiting");
      void Promise.resolve().then(() => {
        // React may replay an effect before this microtask runs. A cancelled
        // attempt must not briefly obtain the lock and block its replacement.
        if (cancelled) return;
        return locks.request("acm-studio-writer-v1", { mode: "exclusive", ifAvailable: true }, async (lock) => {
          if (cancelled || !lock) return;
          token = Symbol("Studio writer");
          this.owner = token;
          this.notify("loading");
          await new Promise<void>((resolve) => {
            this.releaseLock = resolve;
            try { onLoad(token!); }
            catch { this.loaded(token!, false); }
          });
        });
      }).catch(() => { if (!cancelled && !token) this.notify("unavailable"); });
    }
    return () => {
      cancelled = true;
      if (!token || this.owner !== token) return;
      this.owner = null;
      this.notify("waiting");
      const release = this.releaseLock;
      this.releaseLock = null;
      // Invalidate UI writes immediately, but retain the cross-tab lock until
      // transactions and a restore already in progress have settled.
      void Promise.allSettled([...this.pending]).then(() => release?.());
    };
  }

  loaded(token: symbol, readable: boolean) {
    if (this.owner === token && this.state === "loading") this.notify(readable ? "writable" : "unreadable");
  }
  canWrite(token?: symbol | null) { return this.owner !== null && this.state === "writable" && (token === undefined || token === this.owner); }
  assertWritable(token?: symbol | null) {
    if (!this.canWrite(token)) throw new Error("This Studio tab is read-only. Close the other editing tab, then try editing here.");
  }
  captureWriteToken(): symbol {
    this.assertWritable();
    return this.owner!;
  }
  write<T>(operation: () => Promise<T>, permit?: RestorePermit): Promise<T> {
    if (permit) {
      if (permit !== this.restorePermit) return Promise.reject(new Error("The restore is no longer authorised."));
    } else {
      try { this.assertWritable(); } catch (error) { return Promise.reject(error); }
    }
    // Register before running anything that can yield or open an IndexedDB.
    const pending = Promise.resolve().then(operation);
    this.pending.add(pending);
    void pending.finally(() => this.pending.delete(pending)).catch(() => undefined);
    return pending;
  }

  restore<T>(operation: (permit: RestorePermit) => Promise<T>): Promise<T> {
    if (!this.owner || !["writable", "unreadable"].includes(this.state)) return Promise.reject(new Error("This Studio tab cannot restore while another tab or operation owns the workspace."));
    const previousState = this.state;
    const token = this.owner;
    const permit = { token: Symbol("Studio restore") };
    this.restorePermit = permit;
    const inFlight = [...this.pending];
    this.notify("restoring");
    const restore = (async () => {
      await Promise.allSettled(inFlight);
      try {
        const result = await operation(permit);
        // Reload must install the restored snapshot before editing resumes.
        if (this.owner === token) this.notify("blocked");
        return result;
      } catch (error) {
        if (this.owner === token) this.notify(error instanceof AggregateError ? "blocked" : previousState);
        throw error;
      } finally { this.restorePermit = null; }
    })();
    this.pending.add(restore);
    void restore.finally(() => this.pending.delete(restore)).catch(() => undefined);
    return restore;
  }
}

export const studioWriteOwnership = new StudioWriteOwnership();

export function ownershipMessage(state: OwnershipState) {
  if (state === "unavailable") return "Read-only: this browser could not coordinate safe local editing.";
  if (state === "waiting") return "Read-only: another Studio tab may be editing. Close it, then try editing here.";
  if (state === "loading") return "Loading the latest local workspace…";
  if (state === "restoring") return "Restoring backup. Editing is paused.";
  if (state === "blocked") return "Editing is paused. Reload after a successful restore; retain your backup if recovery failed.";
  return null;
}
