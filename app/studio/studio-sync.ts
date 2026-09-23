/**
 * Same-origin coordination for browser-local Studio records.
 *
 * The Web Lock still chooses one persistence owner. This protocol lets other
 * tabs submit typed snapshot differences to that owner without synchronising
 * valid local selections, navigation or editor history.
 */
export const STUDIO_SYNC_PROTOCOL = "acm-studio-sync-v2" as const;

export type StudioSyncRole = "primary" | "peer";
export type StudioSyncStatus = "unsupported" | "connecting" | "primary" | "synced" | "conflict" | "disconnected";
export type StudioSyncSnapshotSource = "welcome" | "update" | "commit" | "conflict" | "failover" | "recovery";
export type StudioSyncCommit = {
  source: StudioSyncSnapshotSource;
  /** Present once for each accepted operation submitted by this session. */
  acknowledgedTransaction?: StudioSyncTransaction;
};

export type StudioSyncChange =
  | { kind: "set"; path: string[]; beforePresent: boolean; before: unknown; afterPresent: boolean; after: unknown }
  | { kind: "insert"; path: string[]; index: number; value: Record<string, unknown>; previousId: string | null; nextId: string | null }
  | { kind: "delete"; path: string[]; index: number; value: Record<string, unknown> }
  | { kind: "move"; path: string[]; beforeOrder: string[]; afterOrder: string[] };

export type StudioSyncTransaction = {
  transactionId: string;
  clientId: string;
  brokerEpoch: string;
  baseRevision: number;
  changes: StudioSyncChange[];
};

export type StudioSyncConflict = {
  transaction: StudioSyncTransaction;
  conflicts: StudioSyncMergeConflict[];
  baseSnapshot: unknown;
  remoteSnapshot: unknown;
  localSnapshot: unknown;
  reason: string;
};

export type StudioSyncMergeConflict = {
  change: StudioSyncChange;
  reason: "property" | "delete" | "order" | "invalid";
  current: unknown;
  currentPresent?: boolean;
};

export type StudioSyncChannel = {
  postMessage(message: StudioSyncMessage): void;
  addEventListener(type: "message" | "messageerror", listener: (event: { data: unknown }) => void): void;
  removeEventListener(type: "message" | "messageerror", listener: (event: { data: unknown }) => void): void;
  close(): void;
};

type StudioSyncMessageBase = { protocol: typeof STUDIO_SYNC_PROTOCOL; scope: string; storeKey: string; senderId: string };
export type StudioSyncMessage =
  | (StudioSyncMessageBase & { kind: "hello"; requestId: string })
  | (StudioSyncMessageBase & { kind: "welcome"; requestId: string; brokerEpoch: string; revision: number; snapshot: unknown })
  | (StudioSyncMessageBase & { kind: "operation"; requestId: string; transaction: StudioSyncTransaction; resolution?: true })
  | (StudioSyncMessageBase & { kind: "update"; updateId: string; revision: number; transaction: StudioSyncTransaction })
  | (StudioSyncMessageBase & { kind: "ack"; requestId: string; revision: number; snapshot?: unknown })
  | (StudioSyncMessageBase & { kind: "reject"; requestId: string; revision: number; reason: string; snapshot: unknown; conflicts: StudioSyncMergeConflict[] })
  | (StudioSyncMessageBase & { kind: "announce"; brokerEpoch: string; revision: number })
  | (StudioSyncMessageBase & { kind: "status"; brokerEpoch: string; revision: number; state: "primary" });

export type StudioSyncOptions<T> = {
  scope?: string;
  storeKey: string;
  initialSnapshot: T;
  role: StudioSyncRole;
  validateSnapshot: (value: unknown) => T;
  cloneSnapshot?: (value: T) => T;
  loadAuthoritative?: () => T;
  onSnapshot: (snapshot: T, source: StudioSyncSnapshotSource) => void;
  /** Persisted state only; unlike onSnapshot, this never contains optimistic edits. */
  onCommittedSnapshot?: (snapshot: T, commit: StudioSyncCommit) => void;
  onConflict?: (conflict: StudioSyncConflict) => void;
  onStatus?: (status: StudioSyncStatus) => void;
  persistPrimary: (snapshot: T) => Promise<void> | void;
  channelFactory?: (name: string) => StudioSyncChannel | null;
  clientId?: string;
};

type PendingPeer = { requestId: string; transaction: StudioSyncTransaction; baseSnapshot?: unknown; resolution?: true; resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
type QueuedPrimary = { requestId?: string; transaction: StudioSyncTransaction; baseSnapshot?: unknown; local: boolean; resolution?: true; resolve?: () => void; reject?: (error: Error) => void };
type ConflictState = StudioSyncConflict & { operation: PendingPeer | QueuedPrimary | null };

const MAX_SYNC_BYTES = 8_000_000;
const HELLO_TIMEOUT_MS = 2_500;
const OPERATION_TIMEOUT_MS = 5_000;
const HEARTBEAT_MS = 1_000;
const BROKER_TIMEOUT_MS = 3_500;

function id(prefix: string) {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function equal(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isStableArray(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every(item => isRecord(item) && typeof item.id === "string" && item.id.length > 0);
}

function ignoredPath(path: string[]) {
  const last = path.at(-1);
  return last === "activeDocumentId" || last === "activePageId" || last === "updatedAt";
}

function diffValues(before: unknown, after: unknown, path: string[], changes: StudioSyncChange[]) {
  if (equal(before, after) || ignoredPath(path)) return;
  if (isStableArray(before) && isStableArray(after)) {
    const beforeIds = before.map(item => item.id as string);
    const afterIds = after.map(item => item.id as string);
    const afterMap = new Map(after.map(item => [item.id as string, item]));
    const beforeMap = new Map(before.map(item => [item.id as string, item]));
    // Insertions and deletions have their own operations. Treating either as
    // a move creates a false conflict when another tab removes a different block.
    const beforeRetained = beforeIds.filter(itemId => afterMap.has(itemId));
    const afterRetained = afterIds.filter(itemId => beforeMap.has(itemId));
    before.forEach((item, index) => {
      if (!afterMap.has(item.id as string)) changes.push({ kind: "delete", path, index, value: clone(item) });
    });
    // Remove locally deleted IDs before ordering the retained IDs. A move
    // alongside a deletion must not conflict with its own deleted block.
    if (!equal(beforeRetained, afterRetained)) changes.push({ kind: "move", path, beforeOrder: beforeRetained, afterOrder: afterRetained });
    after.forEach((item, index) => {
      if (!beforeMap.has(item.id as string)) changes.push({ kind: "insert", path, index, value: clone(item), previousId: afterIds[index - 1] ?? null, nextId: afterIds[index + 1] ?? null });
      else diffValues(beforeMap.get(item.id as string), item, [...path, `@${item.id as string}`], changes);
    });
    return;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    changes.push({ kind: "set", path, beforePresent: true, before: clone(before), afterPresent: true, after: clone(after) });
    return;
  }
  if (isRecord(before) && isRecord(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      if (ignoredPath([...path, key])) continue;
      const beforePresent = Object.prototype.hasOwnProperty.call(before, key);
      const afterPresent = Object.prototype.hasOwnProperty.call(after, key);
      diffValues(beforePresent ? before[key] : undefined, afterPresent ? after[key] : undefined, [...path, key], changes);
      if (beforePresent !== afterPresent && !changes.some(change => change.kind === "set" && equal(change.path, [...path, key]))) {
        changes.push({ kind: "set", path: [...path, key], beforePresent, before: beforePresent ? clone(before[key]) : null, afterPresent, after: afterPresent ? clone(after[key]) : null });
      }
    }
    return;
  }
  changes.push({ kind: "set", path, beforePresent: before !== undefined, before: before === undefined ? null : clone(before), afterPresent: after !== undefined, after: after === undefined ? null : clone(after) });
}

export function createStudioTransaction<T>(before: T, after: T, options: { transactionId: string; clientId: string; brokerEpoch: string; baseRevision: number }): StudioSyncTransaction {
  const changes: StudioSyncChange[] = [];
  diffValues(before, after, [], changes);
  // Keep selection local normally. Include the sender's fallback with deletions
  // so a receiver can replace a selection whose document no longer exists.
  if (isRecord(before) && isRecord(after)
    && typeof before.activeDocumentId === "string" && typeof after.activeDocumentId === "string"
    && Array.isArray(before.documents) && Array.isArray(after.documents)) {
    const hadActiveDocument = before.documents.some(document => isRecord(document) && document.id === before.activeDocumentId);
    const activeDocumentRemains = after.documents.some(document => isRecord(document) && document.id === before.activeDocumentId);
    const nextSelectionExists = after.documents.some(document => isRecord(document) && document.id === after.activeDocumentId);
    const nextSelectionIsEmpty = after.documents.length === 0 && after.activeDocumentId === "";
    const documentWasDeleted = changes.some(change => change.kind === "delete" && equal(change.path, ["documents"]));
    if ((documentWasDeleted || !hadActiveDocument || !activeDocumentRemains)
      && (nextSelectionExists || nextSelectionIsEmpty)
      && (documentWasDeleted || before.activeDocumentId !== after.activeDocumentId)) {
      changes.push({ kind: "set", path: ["activeDocumentId"], beforePresent: true, before: before.activeDocumentId, afterPresent: true, after: after.activeDocumentId });
    }
  }
  return { ...options, changes };
}

function resolveValue(root: unknown, path: string[]) {
  let current: unknown = root;
  for (const token of path) {
    if (token.startsWith("@")) {
      if (!Array.isArray(current)) return { present: false, value: undefined };
      current = current.find(item => isRecord(item) && item.id === token.slice(1));
      if (current === undefined) return { present: false, value: undefined };
    } else if (isRecord(current) && Object.prototype.hasOwnProperty.call(current, token)) current = current[token];
    else return { present: false, value: undefined };
  }
  return { present: true, value: current };
}

function resolveParent(root: unknown, path: string[]) {
  if (!path.length) return { parent: null, key: null, present: true, value: root };
  const parent = resolveValue(root, path.slice(0, -1));
  if (!parent.present) return { parent: null, key: path.at(-1)!, present: false, value: undefined };
  const key = path.at(-1)!;
  if (key.startsWith("@")) {
    if (!Array.isArray(parent.value)) return { parent: null, key, present: false, value: undefined };
    const index = parent.value.findIndex(item => isRecord(item) && item.id === key.slice(1));
    return { parent: parent.value, key: index, present: index >= 0, value: index >= 0 ? parent.value[index] : undefined };
  }
  return { parent: parent.value, key, present: isRecord(parent.value) && Object.prototype.hasOwnProperty.call(parent.value, key), value: isRecord(parent.value) ? parent.value[key] : undefined };
}

function setPath(root: unknown, path: string[], present: boolean, value: unknown) {
  const target = resolveParent(root, path);
  if (target.parent === null) return;
  if (Array.isArray(target.parent) && typeof target.key === "number") {
    if (present) target.parent[target.key] = clone(value);
    else target.parent.splice(target.key, 1);
  } else if (isRecord(target.parent)) {
    if (present) target.parent[target.key as string] = clone(value);
    else delete target.parent[target.key as string];
  }
}

function sameUniqueIds(before: string[], after: string[]) {
  if (before.length !== after.length) return false;
  const beforeSet = new Set(before);
  return beforeSet.size === before.length && new Set(after).size === after.length && after.every(itemId => beforeSet.has(itemId));
}

function reorderKnown(current: string[], before: string[], after: string[]) {
  if (!sameUniqueIds(before, after)) return null;
  const known = new Set(before);
  const currentKnown = current.filter(id => known.has(id));
  if (!equal(currentKnown, before)) return null;
  const leading: string[] = [];
  const trailing: string[] = [];
  const between = new Map<string, string[]>();
  const afterPosition = new Map(after.map((itemId, index) => [itemId, index]));
  const followingKnown: Array<string | null> = new Array(current.length);
  let following: string | null = null;
  for (let index = current.length - 1; index >= 0; index -= 1) {
    followingKnown[index] = following;
    if (known.has(current[index])) following = current[index];
  }
  let previous: string | null = null;
  for (let index = 0; index < current.length; index += 1) {
    const itemId = current[index];
    if (known.has(itemId)) { previous = itemId; continue; }
    const next = followingKnown[index];
    if (!previous) leading.push(itemId);
    else if (!next) trailing.push(itemId);
    else {
      if (afterPosition.get(next) !== (afterPosition.get(previous) ?? -2) + 1) return null;
      between.set(previous, [...(between.get(previous) ?? []), itemId]);
    }
  }
  if (!currentKnown.length) return current;
  const firstKnown = currentKnown[0];
  const lastKnown = currentKnown.at(-1);
  return after.flatMap(itemId => [
    ...(itemId === firstKnown ? leading : []),
    itemId,
    ...(between.get(itemId) ?? []),
    ...(itemId === lastKnown ? trailing : []),
  ]);
}

function reorderPresent(current: string[], after: string[]) {
  const present = new Set(current);
  const desired = after.filter(itemId => present.has(itemId));
  const known = new Set(after);
  let index = 0;
  return current.map(itemId => known.has(itemId) ? desired[index++] : itemId);
}

export function applyStudioTransaction<T>(currentValue: T, transaction: StudioSyncTransaction, preferLocal = false): { snapshot: T; conflicts: StudioSyncMergeConflict[] } {
  const snapshot = clone(currentValue);
  const conflicts: StudioSyncMergeConflict[] = [];
  for (const change of transaction.changes) {
    if (change.kind === "set") {
      const target = resolveValue(snapshot, change.path);
      if (resolveParent(snapshot, change.path).parent === null) {
        conflicts.push({ change, reason: "invalid", current: target.value, currentPresent: target.present });
        continue;
      }
      if (ignoredPath(change.path)) {
        if (change.path.length === 1 && change.path[0] === "activeDocumentId" && isRecord(snapshot) && Array.isArray(snapshot.documents)) {
          const documents = snapshot.documents;
          const activeDocumentId = snapshot.activeDocumentId;
          const currentSelectionRemains = typeof activeDocumentId === "string"
            && documents.some(item => isRecord(item) && item.id === activeDocumentId);
          const nextSelectionExists = change.afterPresent && typeof change.after === "string"
            && documents.some(item => isRecord(item) && item.id === change.after);
          const nextSelectionIsEmpty = documents.length === 0 && change.afterPresent && change.after === "";
          if (!currentSelectionRemains) {
            if (nextSelectionExists || nextSelectionIsEmpty) {
              setPath(snapshot, change.path, change.afterPresent, change.after);
            } else if (documents.length > 0) {
              const fallbackDocument = documents.find(item => isRecord(item) && typeof item.id === "string");
              if (isRecord(fallbackDocument) && typeof fallbackDocument.id === "string") {
                setPath(snapshot, change.path, true, fallbackDocument.id);
              }
            }
          }
        }
        continue;
      }
      if (target.present === change.afterPresent && (!target.present || equal(target.value, change.after))) continue;
      if (target.present === change.beforePresent && (!target.present || equal(target.value, change.before))) { setPath(snapshot, change.path, change.afterPresent, change.after); continue; }
      if (preferLocal) setPath(snapshot, change.path, change.afterPresent, change.after);
      else conflicts.push({ change, reason: "property", current: target.value, currentPresent: target.present });
    } else {
      const collection = resolveValue(snapshot, change.path).value;
      if (!Array.isArray(collection)) { conflicts.push({ change, reason: "invalid", current: collection }); continue; }
      if (change.kind === "insert") {
        const existing = collection.find(item => isRecord(item) && item.id === change.value.id);
        if (existing) { if (!equal(existing, change.value)) { if (preferLocal) collection.splice(collection.indexOf(existing), 1, clone(change.value)); else conflicts.push({ change, reason: "property", current: existing }); } continue; }
        let nextIndex = change.nextId ? collection.findIndex(item => isRecord(item) && item.id === change.nextId) : -1;
        const previousIndex = change.previousId ? collection.findIndex(item => isRecord(item) && item.id === change.previousId) : -1;
        if (nextIndex >= 0 && previousIndex >= nextIndex) {
          if (!preferLocal) { conflicts.push({ change, reason: "order", current: collection.map(item => isRecord(item) ? item.id : null) }); continue; }
          const [nextBlock] = collection.splice(nextIndex, 1);
          const preceding = collection.findIndex(item => isRecord(item) && item.id === change.previousId);
          collection.splice(preceding + 1, 0, nextBlock);
          nextIndex = preceding + 1;
        }
        const insertionIndex = nextIndex >= 0 ? nextIndex : previousIndex >= 0 ? previousIndex + 1 : change.index;
        collection.splice(Math.max(0, Math.min(insertionIndex, collection.length)), 0, clone(change.value));
      } else if (change.kind === "delete") {
        const index = collection.findIndex(item => isRecord(item) && item.id === change.value.id);
        if (index < 0) continue;
        if (!equal(collection[index], change.value) && !preferLocal) { conflicts.push({ change, reason: "delete", current: collection[index] }); continue; }
        collection.splice(index, 1);
      } else {
        const currentOrder = collection.map(item => isRecord(item) ? String(item.id) : "");
        if (equal(currentOrder, change.afterOrder)) continue;
        const nextOrder = reorderKnown(currentOrder, change.beforeOrder, change.afterOrder)
          ?? (preferLocal ? reorderPresent(currentOrder, change.afterOrder) : null);
        if (!nextOrder) { conflicts.push({ change, reason: "order", current: currentOrder }); continue; }
        const byId = new Map(collection.filter(isRecord).map(item => [String(item.id), item]));
        collection.splice(0, collection.length, ...nextOrder.map(id => byId.get(id)).filter((item): item is Record<string, unknown> => Boolean(item)));
      }
    }
  }
  return { snapshot, conflicts };
}

function validId(value: unknown) { return typeof value === "string" && value.length > 0 && value.length < 200; }
function validRevision(value: unknown) { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
function validChange(value: unknown): value is StudioSyncChange {
  if (!isRecord(value) || !Array.isArray(value.path) || value.path.some(token => !validId(token))) return false;
  if (value.kind === "set") return typeof value.beforePresent === "boolean" && typeof value.afterPresent === "boolean";
  if (value.kind === "insert" || value.kind === "delete") {
    if (typeof value.index !== "number" || !Number.isSafeInteger(value.index) || value.index < 0 || !isRecord(value.value) || !validId(value.value.id)) return false;
    return value.kind === "delete" || ((value.previousId === null || validId(value.previousId)) && (value.nextId === null || validId(value.nextId)));
  }
  if (value.kind === "move") return Array.isArray(value.beforeOrder) && Array.isArray(value.afterOrder) && value.beforeOrder.every(validId) && value.afterOrder.every(validId) && sameUniqueIds(value.beforeOrder, value.afterOrder);
  return false;
}
function validTransaction(value: unknown): value is StudioSyncTransaction {
  return isRecord(value) && validId(value.transactionId) && validId(value.clientId) && validId(value.brokerEpoch) && validRevision(value.baseRevision) && Array.isArray(value.changes) && value.changes.length <= 20_000 && value.changes.every(validChange);
}

export function validateStudioSyncMessage<T>(value: unknown, storeKey: string, validateSnapshot: (snapshot: unknown) => T, scope = "main-studio"): StudioSyncMessage | null {
  if (!isRecord(value) || value.protocol !== STUDIO_SYNC_PROTOCOL || value.scope !== scope || value.storeKey !== storeKey || !validId(value.senderId) || !validId(value.kind)) return null;
  try { if (JSON.stringify(value).length > MAX_SYNC_BYTES) return null; } catch { return null; }
  if (value.kind === "hello" && validId(value.requestId)) return value as StudioSyncMessage;
  if (value.kind === "welcome" && validId(value.requestId) && validId(value.brokerEpoch) && validRevision(value.revision)) { try { validateSnapshot(value.snapshot); return value as StudioSyncMessage; } catch { return null; } }
  if (value.kind === "operation" && validId(value.requestId) && validTransaction(value.transaction) && (value.resolution === undefined || value.resolution === true)) return value as StudioSyncMessage;
  if (value.kind === "update" && validId(value.updateId) && validRevision(value.revision) && validTransaction(value.transaction)) return value as StudioSyncMessage;
  if (value.kind === "ack" && validId(value.requestId) && validRevision(value.revision)) { try { if (value.snapshot !== undefined) validateSnapshot(value.snapshot); return value as StudioSyncMessage; } catch { return null; } }
  if (value.kind === "reject" && validId(value.requestId) && validRevision(value.revision) && validId(value.reason) && Array.isArray(value.conflicts)) { try { validateSnapshot(value.snapshot); return value as StudioSyncMessage; } catch { return null; } }
  if ((value.kind === "announce" || value.kind === "status") && validId(value.brokerEpoch) && validRevision(value.revision)) return value as StudioSyncMessage;
  return null;
}

function defaultChannelFactory(name: string): StudioSyncChannel | null {
  if (typeof globalThis.BroadcastChannel !== "function") return null;
  return new globalThis.BroadcastChannel(name) as unknown as StudioSyncChannel;
}

export class StudioSyncSession<T> {
  private readonly options: StudioSyncOptions<T>;
  private readonly clientId: string;
  private readonly cloneSnapshot: (value: T) => T;
  private readonly channel: StudioSyncChannel | null;
  private readonly completed = new Map<string, { accepted: boolean; revision: number; reason?: string }>();
  private readonly pending = new Map<string, PendingPeer>();
  private peerQueue: PendingPeer[] = [];
  private primaryQueue: QueuedPrimary[] = [];
  private processingPrimary = false;
  private processingPeer = false;
  private role: StudioSyncRole;
  private brokerEpoch = "";
  private revision = 0;
  private snapshot: T;
  private optimisticSnapshot: T;
  private status: StudioSyncStatus = "connecting";
  private conflict: ConflictState | null = null;
  private pendingResumedConflict: StudioSyncConflict | null = null;
  private helloTimer: ReturnType<typeof setTimeout> | null = null;
  private helloRequestId: string | null = null;
  private acknowledgedTransactions = new Set<string>();
  private brokerTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;

  private readonly onMessage = (event: { data: unknown }) => {
    const message = validateStudioSyncMessage(event.data, this.options.storeKey, this.options.validateSnapshot, this.options.scope ?? "main-studio");
    if (!message || message.senderId === this.clientId || this.closed) return;
    this.handleMessage(message);
  };
  private readonly onMessageError = () => this.setStatus("disconnected");

  constructor(options: StudioSyncOptions<T>) {
    this.options = options;
    this.clientId = options.clientId ?? id("client");
    this.cloneSnapshot = options.cloneSnapshot ?? clone;
    this.role = options.role;
    this.snapshot = this.validate(options.initialSnapshot);
    this.optimisticSnapshot = this.cloneSnapshot(this.snapshot);
    const factory = options.channelFactory ?? defaultChannelFactory;
    try { this.channel = factory(`acm-studio-sync-${options.scope ?? "main-studio"}-${options.storeKey}`); } catch { this.channel = null; }
    if (!this.channel) {
      if (this.role === "primary") {
        try {
          if (this.options.loadAuthoritative) this.snapshot = this.validate(this.options.loadAuthoritative());
          this.optimisticSnapshot = this.cloneSnapshot(this.snapshot);
          this.notifyCommitted("failover");
          this.options.onSnapshot(this.snapshot, "failover");
        } catch { this.status = "disconnected"; this.notifyStatus(); return; }
      }
      this.status = "unsupported"; this.notifyStatus(); return;
    }
    this.channel.addEventListener("message", this.onMessage);
    this.channel.addEventListener("messageerror", this.onMessageError);
    if (this.role === "primary") this.becomePrimary(); else this.sendHello();
  }

  getStatus() { return this.status; }
  getConflict() { return this.conflict; }

  resumeConflict(previous: StudioSyncConflict) {
    if (this.closed) return;
    if (this.role === "peer" && this.status !== "synced") {
      this.pendingResumedConflict = clone(previous);
      return;
    }
    this.installResumedConflict(previous);
  }

  private installResumedConflict(previous: StudioSyncConflict) {
    const localSnapshot = this.validate(previous.localSnapshot);
    const baseSnapshot = this.validate(previous.baseSnapshot);
    this.optimisticSnapshot = this.cloneSnapshot(localSnapshot);
    this.conflict = { ...previous, baseSnapshot, localSnapshot: this.cloneSnapshot(localSnapshot), remoteSnapshot: this.cloneSnapshot(this.snapshot), operation: null };
    this.setStatus("conflict");
    this.options.onConflict?.(this.conflict);
  }
  isAvailable() { return this.channel !== null && !this.closed; }
  isPrimary() { return this.role === "primary" && !this.closed; }
  isConnectedPeer() { return this.role === "peer" && this.status === "synced" && this.isAvailable() && !this.conflict; }

  setRole(role: StudioSyncRole) {
    if (this.closed || this.role === role) return;
    this.role = role;
    if (!this.channel) { this.setStatus("unsupported"); return; }
    if (role === "primary") this.becomePrimary();
    else { this.stopHeartbeat(); this.brokerEpoch = ""; this.setStatus("connecting"); this.sendHello(); }
  }

  submit(snapshot: T) {
    if (!this.isConnectedPeer()) return Promise.reject(new Error("Studio is not connected to its primary tab."));
    const validated = this.validate(snapshot);
    const baseSnapshot = this.cloneSnapshot(this.optimisticSnapshot);
    const transaction = this.makeTransaction(this.optimisticSnapshot, validated, this.revision + this.peerQueue.length + this.pending.size);
    this.optimisticSnapshot = this.cloneSnapshot(validated);
    if (!transaction.changes.length) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const operation: PendingPeer = { requestId: id("operation"), transaction, baseSnapshot, resolve, reject, timer: setTimeout(() => this.failPeer(operation.requestId, new Error("The primary Studio tab stopped responding.")), OPERATION_TIMEOUT_MS) };
      this.peerQueue.push(operation); void this.processPeerQueue();
    });
  }

  commitPrimary(snapshot: T) {
    if (!this.isPrimary()) return Promise.reject(new Error("This tab is not the Studio persistence owner."));
    const validated = this.validate(snapshot);
    const baseSnapshot = this.cloneSnapshot(this.optimisticSnapshot);
    const transaction = this.makeTransaction(this.optimisticSnapshot, validated, this.revision + this.primaryQueue.length);
    this.optimisticSnapshot = this.cloneSnapshot(validated);
    if (!transaction.changes.length) return Promise.resolve();
    return new Promise<void>((resolve, reject) => { this.primaryQueue.push({ transaction, baseSnapshot, local: true, resolve, reject }); void this.processPrimaryQueue(); });
  }

  resolveConflict(choice: "mine" | "theirs") {
    if (!this.conflict || this.closed) return Promise.reject(new Error("There is no Studio conflict to resolve."));
    const conflict = this.conflict;
    const localResolution = choice === "mine"
      ? applyStudioTransaction(this.validate(conflict.remoteSnapshot), this.makeTransaction(this.validate(conflict.baseSnapshot), this.validate(conflict.localSnapshot), this.revision), true)
      : null;
    if (localResolution?.conflicts.length) return Promise.reject(new Error("These changes cannot be merged automatically. Your unsaved version is still in this tab; keep it open while you review it."));
    const candidate = localResolution ? this.validate(localResolution.snapshot) : this.cloneSnapshot(conflict.remoteSnapshot as T);
    this.conflict = null;
    this.snapshot = this.validate(conflict.remoteSnapshot);
    this.optimisticSnapshot = this.cloneSnapshot(candidate);
    if (choice === "theirs") this.options.onSnapshot(this.snapshot, "conflict");
    this.setStatus(this.role === "primary" ? "primary" : "synced");
    if (choice === "theirs") {
      if (this.primaryQueue.length) void this.processPrimaryQueue();
      return Promise.resolve();
    }
    const transaction = this.makeTransaction(this.snapshot, candidate, this.revision);
    if (!transaction.changes.length) {
      this.options.onSnapshot(this.optimisticSnapshot, "conflict");
      if (this.primaryQueue.length) void this.processPrimaryQueue();
      return Promise.resolve();
    }
    const attempt = this.role === "primary" ? new Promise<void>((resolve, reject) => { this.primaryQueue.unshift({ transaction, local: true, resolution: true, resolve, reject }); void this.processPrimaryQueue(); }) : new Promise<void>((resolve, reject) => {
      const operation: PendingPeer = { requestId: id("resolution"), transaction, resolution: true, resolve, reject, timer: setTimeout(() => this.failPeer(operation.requestId, new Error("The primary Studio tab stopped responding.")), OPERATION_TIMEOUT_MS) };
      this.peerQueue.unshift(operation); void this.processPeerQueue();
    });
    return attempt.then(() => {
      // A peer does not replay its own update, so install the resolved view
      // before the workspace can autosave again.
      this.options.onSnapshot(this.optimisticSnapshot, "conflict");
    }).catch((error) => {
      // A failed resolution must remain retryable, including after a quota
      // error or a new change from another tab while the choice was in flight.
      if (!this.conflict) {
        this.optimisticSnapshot = this.cloneSnapshot(candidate);
        this.conflict = { ...conflict, remoteSnapshot: this.cloneSnapshot(this.snapshot), localSnapshot: this.cloneSnapshot(candidate), baseSnapshot: this.cloneSnapshot(this.snapshot) };
        this.setStatus("conflict"); this.options.onConflict?.(this.conflict);
      }
      throw error;
    });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.helloTimer) clearTimeout(this.helloTimer);
    if (this.brokerTimer) clearTimeout(this.brokerTimer);
    this.stopHeartbeat();
    this.pending.forEach(operation => { clearTimeout(operation.timer); operation.reject(new Error("The Studio sync session closed.")); });
    this.peerQueue.forEach(operation => { clearTimeout(operation.timer); operation.reject(new Error("The Studio sync session closed.")); });
    this.pending.clear(); this.peerQueue = [];
    this.channel?.removeEventListener("message", this.onMessage);
    this.channel?.removeEventListener("messageerror", this.onMessageError);
    this.channel?.close();
  }

  private validate(value: unknown) { return this.options.validateSnapshot(value); }
  private notifyCommitted(source: StudioSyncSnapshotSource, transaction?: StudioSyncTransaction) {
    let acknowledgedTransaction: StudioSyncTransaction | undefined;
    if (transaction?.clientId === this.clientId && !this.acknowledgedTransactions.has(transaction.transactionId)) {
      acknowledgedTransaction = transaction;
      this.acknowledgedTransactions.add(transaction.transactionId);
      if (this.acknowledgedTransactions.size > 500) this.acknowledgedTransactions.delete(this.acknowledgedTransactions.values().next().value!);
    }
    this.options.onCommittedSnapshot?.(this.cloneSnapshot(this.snapshot), { source, acknowledgedTransaction });
  }
  private makeTransaction(before: T, after: T, baseRevision: number) { return createStudioTransaction(before, after, { transactionId: id("transaction"), clientId: this.clientId, brokerEpoch: this.brokerEpoch, baseRevision }); }
  private notifyStatus() { this.options.onStatus?.(this.status); }
  private setStatus(status: StudioSyncStatus) { if (this.status === status) return; this.status = status; this.notifyStatus(); if (status === "disconnected") this.failPending(new Error("The primary Studio tab stopped responding.")); }
  private failPending(error: Error) { this.pending.forEach(operation => { clearTimeout(operation.timer); operation.reject(error); }); this.pending.clear(); }
  private failPeer(requestId: string, error: Error) { const operation = this.pending.get(requestId); if (!operation) return; this.pending.delete(requestId); clearTimeout(operation.timer); operation.reject(error); this.setStatus("disconnected"); }
  private remember(transactionId: string, accepted: boolean, revision: number, reason?: string) { this.completed.set(transactionId, { accepted, revision, reason }); if (this.completed.size > 500) this.completed.delete(this.completed.keys().next().value!); }
  private send(message: StudioSyncMessage) { if (!this.channel || this.closed) return; try { this.channel.postMessage(message); } catch { this.setStatus("disconnected"); } }
  private base() { return { protocol: STUDIO_SYNC_PROTOCOL, scope: this.options.scope ?? "main-studio", storeKey: this.options.storeKey, senderId: this.clientId } as const; }
  private announce(kind: "announce" | "status") {
    if (kind === "status") this.send({ ...this.base(), kind, brokerEpoch: this.brokerEpoch, revision: this.revision, state: "primary" });
    else this.send({ ...this.base(), kind, brokerEpoch: this.brokerEpoch, revision: this.revision });
  }
  private becomePrimary() {
    const interruptedConflict = this.conflict ?? this.pendingResumedConflict;
    this.conflict = null;
    this.pendingResumedConflict = null;
    this.failPending(new Error("The Studio persistence owner changed. Reload the latest saved state before continuing."));
    this.peerQueue.forEach(operation => operation.reject(new Error("The Studio persistence owner changed.")));
    this.peerQueue = [];
    try {
      if (this.options.loadAuthoritative) this.snapshot = this.validate(this.options.loadAuthoritative());
      this.optimisticSnapshot = this.cloneSnapshot(this.snapshot);
      this.notifyCommitted("failover");
      this.options.onSnapshot(this.snapshot, "failover");
    } catch { this.setStatus("disconnected"); return; }
    this.brokerEpoch = id("epoch"); this.setStatus("primary"); this.announce("announce"); this.announce("status");
    this.stopHeartbeat(); this.heartbeatTimer = setInterval(() => this.announce("status"), HEARTBEAT_MS);
    if (interruptedConflict) this.installResumedConflict(interruptedConflict);
  }
  private stopHeartbeat() { if (this.heartbeatTimer) clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  private sendHello() {
    const requestId = id("hello"); this.helloRequestId = requestId; this.send({ ...this.base(), kind: "hello", requestId });
    if (this.helloTimer) clearTimeout(this.helloTimer);
    this.helloTimer = setTimeout(() => { if (this.role === "peer" && this.status === "connecting") this.setStatus("disconnected"); }, HELLO_TIMEOUT_MS);
  }
  private refreshBrokerTimer() { if (this.brokerTimer) clearTimeout(this.brokerTimer); this.brokerTimer = setTimeout(() => { if (this.role === "peer") this.setStatus("disconnected"); }, BROKER_TIMEOUT_MS); }
  private handleMessage(message: StudioSyncMessage) {
    if (message.kind === "hello") { if (this.isPrimary()) this.sendWelcome(message); return; }
    if (message.kind === "announce") { if (this.role === "peer" && message.brokerEpoch !== this.brokerEpoch) { this.brokerEpoch = message.brokerEpoch; this.revision = message.revision; this.setStatus("connecting"); this.sendHello(); } return; }
    if (message.kind === "status") { if (this.role === "peer" && (!this.brokerEpoch || message.brokerEpoch === this.brokerEpoch)) { this.brokerEpoch = message.brokerEpoch; this.refreshBrokerTimer(); if (this.status !== "synced" && this.status !== "conflict") this.sendHello(); } return; }
    if (message.kind === "welcome") { this.receiveWelcome(message); return; }
    if (message.kind === "operation") { if (this.isPrimary()) void this.receiveOperation(message); return; }
    if (message.kind === "update") { this.receiveUpdate(message); return; }
    if (message.kind === "ack") {
      const operation = this.pending.get(message.requestId);
      if (operation) {
        this.pending.delete(message.requestId);
        clearTimeout(operation.timer);
        const isLatest = message.revision >= this.revision;
        if (message.snapshot !== undefined && isLatest) {
          const authoritative = this.validate(message.snapshot);
          const accepted = applyStudioTransaction(this.snapshot, operation.transaction);
          const remaining = this.makeTransaction(accepted.snapshot, this.optimisticSnapshot, this.revision);
          const rebased = applyStudioTransaction(authoritative, remaining);
          const missedRemoteChanges = message.revision > this.revision && this.makeTransaction(accepted.snapshot, authoritative, this.revision).changes.length > 0;
          this.snapshot = authoritative;
          this.revision = message.revision;
          if (operation.resolution) this.optimisticSnapshot = this.cloneSnapshot(this.snapshot);
          else if (!rebased.conflicts.length) this.optimisticSnapshot = this.validate(rebased.snapshot);
          this.notifyCommitted("commit", operation.transaction);
          if (!operation.resolution && missedRemoteChanges) {
            if (rebased.conflicts.length) this.openConflict(remaining, { snapshot: authoritative, conflicts: rebased.conflicts }, operation, "Studio changes conflict with your local changes.");
            else this.options.onSnapshot(this.optimisticSnapshot, "update");
          }
        } else if (!operation.resolution && isLatest) {
          // An ACK may precede its broadcast update. Advance only the committed
          // baseline; never replace an editor view that could contain new keystrokes.
          const committed = applyStudioTransaction(this.snapshot, operation.transaction);
          if (message.revision <= this.revision + 1 && !committed.conflicts.length) {
            this.snapshot = this.validate(committed.snapshot);
            this.revision = message.revision;
            this.notifyCommitted("commit", operation.transaction);
          } else { this.setStatus("connecting"); this.sendHello(); }
        }
        operation.resolve();
      }
      return;
    }
    if (message.kind === "reject") this.receiveReject(message);
  }
  private sendWelcome(message: Extract<StudioSyncMessage, { kind: "hello" }>) { this.send({ ...this.base(), kind: "welcome", requestId: message.requestId, brokerEpoch: this.brokerEpoch, revision: this.revision, snapshot: this.snapshot }); }
  private receiveWelcome(message: Extract<StudioSyncMessage, { kind: "welcome" }>) {
    if (this.role !== "peer" || message.requestId !== this.helloRequestId) return;
    if (this.brokerEpoch && this.brokerEpoch !== message.brokerEpoch && this.status === "synced") return;
    if (message.brokerEpoch === this.brokerEpoch && message.revision < this.revision) { this.sendHello(); return; }
    this.helloRequestId = null;
    const interruptedConflict = this.conflict ?? this.pendingResumedConflict;
    this.conflict = null;
    this.pendingResumedConflict = null;
    const unsaved = this.makeTransaction(this.snapshot, this.optimisticSnapshot, this.revision);
    this.brokerEpoch = message.brokerEpoch; this.revision = message.revision; this.snapshot = this.validate(message.snapshot);
    const rebased = applyStudioTransaction(this.snapshot, unsaved);
    if (!rebased.conflicts.length) this.optimisticSnapshot = this.validate(rebased.snapshot);
    if (this.helloTimer) clearTimeout(this.helloTimer);
    this.refreshBrokerTimer();
    // Install the authoritative snapshot before exposing a writable peer. A
    // newly opened tab may have loaded older browser storage while it waited
    // for the primary tab to answer.
    this.notifyCommitted("welcome");
    this.options.onSnapshot(this.optimisticSnapshot, "welcome");
    this.setStatus("synced");
    if (interruptedConflict) this.installResumedConflict(interruptedConflict);
    else if (rebased.conflicts.length) this.openConflict(unsaved, { snapshot: this.snapshot, conflicts: rebased.conflicts }, null, "Studio changes conflict with your local changes.");
  }
  private async receiveOperation(message: Extract<StudioSyncMessage, { kind: "operation" }>) {
    const transaction = message.transaction; const previous = this.completed.get(transaction.transactionId);
    if (previous) { this.send(previous.accepted ? { ...this.base(), kind: "ack", requestId: message.requestId, revision: previous.revision } : { ...this.base(), kind: "reject", requestId: message.requestId, revision: previous.revision, reason: previous.reason ?? "Duplicate operation.", snapshot: this.snapshot, conflicts: [] }); return; }
    if (transaction.brokerEpoch !== this.brokerEpoch || transaction.baseRevision > this.revision) { this.remember(transaction.transactionId, false, this.revision, "The Studio revision is ahead of this tab."); this.sendReject(message.requestId, "The Studio revision is ahead of this tab.", []); return; }
    this.primaryQueue.push({ requestId: message.requestId, transaction, local: false, resolution: message.resolution }); await this.processPrimaryQueue();
  }
  private async processPrimaryQueue() {
    if (this.processingPrimary) return; this.processingPrimary = true;
    try {
      while (this.primaryQueue.length) {
        const operation = this.primaryQueue.shift()!; const previousSnapshot = this.snapshot; const result = applyStudioTransaction(previousSnapshot, operation.transaction, operation.resolution === true);
        if (result.conflicts.length) { const error = new Error("Studio changes conflict with another tab."); if (operation.local) { this.openConflict(operation.transaction, { ...result, snapshot: previousSnapshot }, operation, error.message); operation.reject?.(error); break; } this.remember(operation.transaction.transactionId, false, this.revision, error.message); this.sendReject(operation.requestId ?? operation.transaction.transactionId, error.message, result.conflicts); continue; }
        try {
          await this.options.persistPrimary(this.validate(result.snapshot));
          this.snapshot = this.validate(result.snapshot);
          // Selection and timestamps are tab-local, not outstanding content.
          // For a remote operation, compare with the state before that operation.
          const localBase = operation.local ? this.snapshot : previousSnapshot;
          const hasNewerLocalEdits = this.makeTransaction(localBase, this.optimisticSnapshot, this.revision).changes.length > 0;
          let mergedRemote = false;
          if (!hasNewerLocalEdits || (operation.local && operation.resolution)) this.optimisticSnapshot = this.cloneSnapshot(this.snapshot);
          else if (!operation.local) {
            const merged = applyStudioTransaction(this.optimisticSnapshot, operation.transaction);
            if (!merged.conflicts.length) { this.optimisticSnapshot = this.validate(merged.snapshot); mergedRemote = true; }
          }
          this.revision += 1; this.remember(operation.transaction.transactionId, true, this.revision);
          this.notifyCommitted("commit", operation.transaction);
          if (!hasNewerLocalEdits) this.options.onSnapshot(this.snapshot, operation.local ? "commit" : "update");
          else if (mergedRemote && !this.primaryQueue.some(pending => pending.local)) this.options.onSnapshot(this.optimisticSnapshot, "update");
          // A resolution may have applied against a newer owner snapshot. Send
          // the actual saved difference so other peers do not see a false conflict.
          const updateTransaction = operation.resolution
            ? { ...this.makeTransaction(previousSnapshot, this.snapshot, this.revision - 1), transactionId: operation.transaction.transactionId, clientId: operation.transaction.clientId }
            : operation.transaction;
          this.send({ ...this.base(), kind: "update", updateId: id("update"), revision: this.revision, transaction: updateTransaction });
          if (operation.requestId) this.send({ ...this.base(), kind: "ack", requestId: operation.requestId, revision: this.revision, snapshot: this.snapshot });
          operation.resolve?.();
        } catch (error) {
          const reason = error instanceof Error ? error.message : "The Studio data could not be saved.";
          this.optimisticSnapshot = this.cloneSnapshot(this.snapshot);
          this.notifyCommitted("recovery");
          this.options.onSnapshot(this.snapshot, "recovery");
          this.remember(operation.transaction.transactionId, false, this.revision, reason);
          this.sendReject(operation.requestId ?? operation.transaction.transactionId, reason, []);
          operation.reject?.(error instanceof Error ? error : new Error(reason));
          const queued = this.primaryQueue.splice(0);
          queued.forEach((pending) => {
            pending.reject?.(new Error("The previous Studio change could not be saved."));
            if (pending.requestId) this.sendReject(pending.requestId, "The previous Studio change could not be saved.", []);
          });
        }
      }
    } finally {
      this.processingPrimary = false;
      if (this.primaryQueue.length && !this.conflict) void this.processPrimaryQueue();
    }
  }
  private sendReject(requestId: string, reason: string, conflicts: StudioSyncMergeConflict[]) { this.send({ ...this.base(), kind: "reject", requestId, revision: this.revision, reason, snapshot: this.snapshot, conflicts }); }
  private receiveUpdate(message: Extract<StudioSyncMessage, { kind: "update" }>) {
    if (this.role !== "peer" || message.revision <= this.revision) return;
    if (message.transaction.brokerEpoch !== this.brokerEpoch) { this.setStatus("connecting"); this.sendHello(); return; }
    if (message.revision !== this.revision + 1) { this.setStatus("connecting"); this.sendHello(); return; }
    const result = applyStudioTransaction(this.snapshot, message.transaction);
    if (result.conflicts.length) {
      if (!this.pending.size && !this.peerQueue.length && !this.makeTransaction(this.snapshot, this.optimisticSnapshot, this.revision).changes.length) {
        // A committed update that disagrees with our committed copy indicates
        // a missed/out-of-order message, not a local edit to resolve.
        this.setStatus("connecting"); this.sendHello(); return;
      }
      this.openConflict(message.transaction, result, null, "Studio changes conflict with your local changes."); return;
    }
    this.revision = message.revision; this.snapshot = this.validate(result.snapshot);
    this.notifyCommitted("update", message.transaction);
    if (message.transaction.clientId === this.clientId) {
      // The editor already contains this change, possibly followed by newer
      // keystrokes. Echoing the committed snapshot would overwrite them.
      this.refreshBrokerTimer();
      return;
    }
    const optimistic = applyStudioTransaction(this.optimisticSnapshot, message.transaction);
    if (!optimistic.conflicts.length) {
      this.optimisticSnapshot = this.validate(optimistic.snapshot);
      this.options.onSnapshot(this.optimisticSnapshot, "update");
    }
    this.refreshBrokerTimer();
  }
  private receiveReject(message: Extract<StudioSyncMessage, { kind: "reject" }>) {
    const operation = this.pending.get(message.requestId);
    // Rejects are broadcast to every tab; only the submitting tab owns this request.
    if (!operation) return;
    const unsavedSnapshot = this.cloneSnapshot(this.optimisticSnapshot);
    this.pending.delete(message.requestId); clearTimeout(operation.timer); operation.reject(new Error(message.reason));
    this.revision = message.revision;
    this.snapshot = this.validate(message.snapshot);
    this.notifyCommitted("recovery");
    this.optimisticSnapshot = this.cloneSnapshot(this.snapshot);
    const queued = this.peerQueue.splice(0);
    queued.forEach((pending) => pending.reject(new Error("The previous Studio change could not be saved.")));
    if (message.conflicts.length) {
      this.optimisticSnapshot = unsavedSnapshot;
      this.openConflict(operation.transaction, { snapshot: this.snapshot, conflicts: message.conflicts }, operation, message.reason);
    } else {
      this.options.onSnapshot(this.snapshot, "recovery");
      this.setStatus(this.role === "primary" ? "primary" : "synced");
    }
  }
  private openConflict(transaction: StudioSyncTransaction, result: { snapshot: T; conflicts: StudioSyncMergeConflict[] }, operation: PendingPeer | QueuedPrimary | null, reason: string) {
    this.conflict = { transaction, conflicts: result.conflicts, remoteSnapshot: this.cloneSnapshot(result.snapshot), localSnapshot: this.cloneSnapshot(this.optimisticSnapshot), baseSnapshot: this.cloneSnapshot((operation?.baseSnapshot ?? this.snapshot) as T), operation, reason };
    this.setStatus("conflict"); this.options.onConflict?.(this.conflict);
  }
  private async processPeerQueue() {
    if (this.processingPeer || !this.isConnectedPeer()) return; this.processingPeer = true;
    try {
      while (this.peerQueue.length && this.isConnectedPeer()) {
        const operation = this.peerQueue.shift()!; this.pending.set(operation.requestId, operation); this.send({ ...this.base(), kind: "operation", requestId: operation.requestId, transaction: operation.transaction, ...(operation.resolution ? { resolution: true } : {}) });
        await new Promise<void>(resolve => { const check = () => { if (!this.pending.has(operation.requestId)) resolve(); else setTimeout(check, 20); }; check(); });
      }
    } finally { this.processingPeer = false; }
  }
}

export function createStudioSync<T>(options: StudioSyncOptions<T>) { return new StudioSyncSession(options); }
