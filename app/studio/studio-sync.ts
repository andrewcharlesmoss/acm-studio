/**
 * Same-origin coordination for browser-local Studio records.
 *
 * The Web Lock still chooses one persistence owner. This protocol lets other
 * tabs submit typed snapshot differences to that owner without sharing local
 * selection, navigation or editor history.
 */
export const STUDIO_SYNC_PROTOCOL = "acm-studio-sync-v1" as const;

export type StudioSyncRole = "primary" | "peer";
export type StudioSyncStatus = "unsupported" | "connecting" | "primary" | "synced" | "conflict" | "disconnected";
export type StudioSyncSnapshotSource = "welcome" | "update" | "commit" | "conflict" | "failover" | "recovery";

export type StudioSyncChange =
  | { kind: "set"; path: string[]; beforePresent: boolean; before: unknown; afterPresent: boolean; after: unknown }
  | { kind: "insert"; path: string[]; index: number; value: Record<string, unknown> }
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
  | (StudioSyncMessageBase & { kind: "operation"; requestId: string; transaction: StudioSyncTransaction })
  | (StudioSyncMessageBase & { kind: "update"; updateId: string; revision: number; transaction: StudioSyncTransaction })
  | (StudioSyncMessageBase & { kind: "ack"; requestId: string; revision: number })
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
  onConflict?: (conflict: StudioSyncConflict) => void;
  onStatus?: (status: StudioSyncStatus) => void;
  persistPrimary: (snapshot: T) => Promise<void> | void;
  channelFactory?: (name: string) => StudioSyncChannel | null;
  clientId?: string;
};

type PendingPeer = { requestId: string; transaction: StudioSyncTransaction; resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
type QueuedPrimary = { requestId?: string; transaction: StudioSyncTransaction; local: boolean; resolve?: () => void; reject?: (error: Error) => void };
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
    if (!equal(beforeIds, afterIds)) changes.push({ kind: "move", path, beforeOrder: beforeIds, afterOrder: afterIds });
    const afterMap = new Map(after.map(item => [item.id as string, item]));
    const beforeMap = new Map(before.map(item => [item.id as string, item]));
    before.forEach((item, index) => {
      if (!afterMap.has(item.id as string)) changes.push({ kind: "delete", path, index, value: clone(item) });
    });
    after.forEach((item, index) => {
      if (!beforeMap.has(item.id as string)) changes.push({ kind: "insert", path, index, value: clone(item) });
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

function reorderKnown(current: string[], before: string[], after: string[]) {
  const known = new Set(before);
  const currentKnown = current.filter(id => known.has(id));
  if (!equal(currentKnown, before)) return null;
  let index = 0;
  return current.map(id => known.has(id) ? after[index++] : id);
}

export function applyStudioTransaction<T>(currentValue: T, transaction: StudioSyncTransaction): { snapshot: T; conflicts: StudioSyncMergeConflict[] } {
  const snapshot = clone(currentValue);
  const conflicts: StudioSyncMergeConflict[] = [];
  for (const change of transaction.changes) {
    if (change.kind === "set") {
      const target = resolveValue(snapshot, change.path);
      if (ignoredPath(change.path)) { setPath(snapshot, change.path, change.afterPresent, change.after); continue; }
      if (target.present && change.afterPresent && equal(target.value, change.after)) continue;
      if (target.present === change.beforePresent && equal(target.value, change.before)) { setPath(snapshot, change.path, change.afterPresent, change.after); continue; }
      conflicts.push({ change, reason: "property", current: target.value, currentPresent: target.present });
    } else {
      const collection = resolveValue(snapshot, change.path).value;
      if (!Array.isArray(collection)) { conflicts.push({ change, reason: "invalid", current: collection }); continue; }
      if (change.kind === "insert") {
        const existing = collection.find(item => isRecord(item) && item.id === change.value.id);
        if (existing) { if (!equal(existing, change.value)) conflicts.push({ change, reason: "property", current: existing }); continue; }
        collection.splice(Math.max(0, Math.min(change.index, collection.length)), 0, clone(change.value));
      } else if (change.kind === "delete") {
        const index = collection.findIndex(item => isRecord(item) && item.id === change.value.id);
        if (index < 0) continue;
        if (!equal(collection[index], change.value)) { conflicts.push({ change, reason: "delete", current: collection[index] }); continue; }
        collection.splice(index, 1);
      } else {
        const currentOrder = collection.map(item => isRecord(item) ? String(item.id) : "");
        if (equal(currentOrder, change.afterOrder)) continue;
        const nextOrder = reorderKnown(currentOrder, change.beforeOrder, change.afterOrder);
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
  if (value.kind === "insert" || value.kind === "delete") return typeof value.index === "number" && Number.isSafeInteger(value.index) && value.index >= 0 && isRecord(value.value) && validId(value.value.id);
  if (value.kind === "move") return Array.isArray(value.beforeOrder) && Array.isArray(value.afterOrder) && value.beforeOrder.every(validId) && value.afterOrder.every(validId);
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
  if (value.kind === "operation" && validId(value.requestId) && validTransaction(value.transaction)) return value as StudioSyncMessage;
  if (value.kind === "update" && validId(value.updateId) && validRevision(value.revision) && validTransaction(value.transaction)) return value as StudioSyncMessage;
  if (value.kind === "ack" && validId(value.requestId) && validRevision(value.revision)) return value as StudioSyncMessage;
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
  private helloTimer: ReturnType<typeof setTimeout> | null = null;
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
    const transaction = this.makeTransaction(this.optimisticSnapshot, validated, this.revision + this.peerQueue.length + this.pending.size);
    this.optimisticSnapshot = this.cloneSnapshot(validated);
    if (!transaction.changes.length) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const operation: PendingPeer = { requestId: id("operation"), transaction, resolve, reject, timer: setTimeout(() => this.failPeer(operation.requestId, new Error("The primary Studio tab stopped responding.")), OPERATION_TIMEOUT_MS) };
      this.peerQueue.push(operation); void this.processPeerQueue();
    });
  }

  commitPrimary(snapshot: T) {
    if (!this.isPrimary()) return Promise.reject(new Error("This tab is not the Studio persistence owner."));
    const validated = this.validate(snapshot);
    const transaction = this.makeTransaction(this.optimisticSnapshot, validated, this.revision + this.primaryQueue.length);
    this.optimisticSnapshot = this.cloneSnapshot(validated);
    if (!transaction.changes.length) return Promise.resolve();
    return new Promise<void>((resolve, reject) => { this.primaryQueue.push({ transaction, local: true, resolve, reject }); void this.processPrimaryQueue(); });
  }

  resolveConflict(choice: "mine" | "theirs") {
    if (!this.conflict || this.closed) return Promise.reject(new Error("There is no Studio conflict to resolve."));
    const conflict = this.conflict;
    const candidate = choice === "mine" ? this.cloneSnapshot(conflict.localSnapshot as T) : this.cloneSnapshot(conflict.remoteSnapshot as T);
    this.conflict = null;
    this.snapshot = this.validate(conflict.remoteSnapshot);
    this.optimisticSnapshot = this.cloneSnapshot(candidate);
    if (choice === "theirs") this.options.onSnapshot(this.snapshot, "conflict");
    this.setStatus(this.role === "primary" ? "primary" : "synced");
    if (choice === "theirs") return Promise.resolve();
    const transaction = this.makeTransaction(this.snapshot, candidate, this.revision);
    if (!transaction.changes.length) return Promise.resolve();
    if (this.role === "primary") return new Promise<void>((resolve, reject) => { this.primaryQueue.unshift({ transaction, local: true, resolve, reject }); void this.processPrimaryQueue(); });
    return new Promise<void>((resolve, reject) => {
      const operation: PendingPeer = { requestId: id("resolution"), transaction, resolve, reject, timer: setTimeout(() => this.failPeer(operation.requestId, new Error("The primary Studio tab stopped responding.")), OPERATION_TIMEOUT_MS) };
      this.peerQueue.unshift(operation); void this.processPeerQueue();
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
    this.failPending(new Error("The Studio persistence owner changed. Reload the latest saved state before continuing."));
    this.peerQueue.forEach(operation => operation.reject(new Error("The Studio persistence owner changed.")));
    this.peerQueue = [];
    try {
      if (this.options.loadAuthoritative) this.snapshot = this.validate(this.options.loadAuthoritative());
      this.optimisticSnapshot = this.cloneSnapshot(this.snapshot);
      this.options.onSnapshot(this.snapshot, "failover");
    } catch { this.setStatus("disconnected"); return; }
    this.brokerEpoch = id("epoch"); this.setStatus("primary"); this.announce("announce"); this.announce("status");
    this.stopHeartbeat(); this.heartbeatTimer = setInterval(() => this.announce("status"), HEARTBEAT_MS);
  }
  private stopHeartbeat() { if (this.heartbeatTimer) clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  private sendHello() {
    const requestId = id("hello"); this.send({ ...this.base(), kind: "hello", requestId });
    if (this.helloTimer) clearTimeout(this.helloTimer);
    this.helloTimer = setTimeout(() => { if (this.role === "peer" && this.status === "connecting") this.setStatus("disconnected"); }, HELLO_TIMEOUT_MS);
  }
  private refreshBrokerTimer() { if (this.brokerTimer) clearTimeout(this.brokerTimer); this.brokerTimer = setTimeout(() => { if (this.role === "peer") this.setStatus("disconnected"); }, BROKER_TIMEOUT_MS); }
  private handleMessage(message: StudioSyncMessage) {
    if (message.kind === "hello") { if (this.isPrimary()) this.sendWelcome(message); return; }
    if (message.kind === "announce") { if (this.role === "peer" && message.brokerEpoch !== this.brokerEpoch) { this.brokerEpoch = message.brokerEpoch; this.revision = message.revision; this.setStatus("connecting"); this.sendHello(); } return; }
    if (message.kind === "status") { if (this.role === "peer" && (!this.brokerEpoch || message.brokerEpoch === this.brokerEpoch)) { this.brokerEpoch = message.brokerEpoch; this.refreshBrokerTimer(); if (this.status !== "synced") this.sendHello(); } return; }
    if (message.kind === "welcome") { this.receiveWelcome(message); return; }
    if (message.kind === "operation") { if (this.isPrimary()) void this.receiveOperation(message); return; }
    if (message.kind === "update") { this.receiveUpdate(message); return; }
    if (message.kind === "ack") { const operation = this.pending.get(message.requestId); if (operation) { this.pending.delete(message.requestId); clearTimeout(operation.timer); this.revision = Math.max(this.revision, message.revision); operation.resolve(); } return; }
    if (message.kind === "reject") this.receiveReject(message);
  }
  private sendWelcome(message: Extract<StudioSyncMessage, { kind: "hello" }>) { this.send({ ...this.base(), kind: "welcome", requestId: message.requestId, brokerEpoch: this.brokerEpoch, revision: this.revision, snapshot: this.snapshot }); }
  private receiveWelcome(message: Extract<StudioSyncMessage, { kind: "welcome" }>) {
    if (this.role !== "peer") return;
    if (this.brokerEpoch && this.brokerEpoch !== message.brokerEpoch && this.status === "synced") return;
    this.brokerEpoch = message.brokerEpoch; this.revision = message.revision; this.snapshot = this.validate(message.snapshot); this.optimisticSnapshot = this.cloneSnapshot(this.snapshot);
    if (this.helloTimer) clearTimeout(this.helloTimer); this.refreshBrokerTimer(); this.setStatus("synced"); this.options.onSnapshot(this.snapshot, "welcome");
  }
  private async receiveOperation(message: Extract<StudioSyncMessage, { kind: "operation" }>) {
    const transaction = message.transaction; const previous = this.completed.get(transaction.transactionId);
    if (previous) { this.send(previous.accepted ? { ...this.base(), kind: "ack", requestId: message.requestId, revision: previous.revision } : { ...this.base(), kind: "reject", requestId: message.requestId, revision: previous.revision, reason: previous.reason ?? "Duplicate operation.", snapshot: this.snapshot, conflicts: [] }); return; }
    if (transaction.brokerEpoch !== this.brokerEpoch || transaction.baseRevision > this.revision) { this.remember(transaction.transactionId, false, this.revision, "The Studio revision is ahead of this tab."); this.sendReject(message.requestId, "The Studio revision is ahead of this tab.", []); return; }
    this.primaryQueue.push({ requestId: message.requestId, transaction, local: false }); await this.processPrimaryQueue();
  }
  private async processPrimaryQueue() {
    if (this.processingPrimary) return; this.processingPrimary = true;
    try {
      while (this.primaryQueue.length) {
        const operation = this.primaryQueue.shift()!; const result = applyStudioTransaction(this.snapshot, operation.transaction);
        if (result.conflicts.length) { const error = new Error("Studio changes conflict with another tab."); if (operation.local) { this.openConflict(operation.transaction, result, operation, error.message); break; } this.remember(operation.transaction.transactionId, false, this.revision, error.message); this.sendReject(operation.requestId ?? operation.transaction.transactionId, error.message, result.conflicts); continue; }
        try {
          await this.options.persistPrimary(this.validate(result.snapshot));
          this.snapshot = this.validate(result.snapshot); this.optimisticSnapshot = this.cloneSnapshot(this.snapshot); this.revision += 1; this.remember(operation.transaction.transactionId, true, this.revision);
          this.options.onSnapshot(this.snapshot, operation.local ? "commit" : "update");
          this.send({ ...this.base(), kind: "update", updateId: id("update"), revision: this.revision, transaction: operation.transaction });
          if (operation.requestId) this.send({ ...this.base(), kind: "ack", requestId: operation.requestId, revision: this.revision });
          operation.resolve?.();
        } catch (error) {
          const reason = error instanceof Error ? error.message : "The Studio data could not be saved.";
          this.optimisticSnapshot = this.cloneSnapshot(this.snapshot);
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
    } finally { this.processingPrimary = false; }
  }
  private sendReject(requestId: string, reason: string, conflicts: StudioSyncMergeConflict[]) { this.send({ ...this.base(), kind: "reject", requestId, revision: this.revision, reason, snapshot: this.snapshot, conflicts }); }
  private receiveUpdate(message: Extract<StudioSyncMessage, { kind: "update" }>) {
    if (this.role !== "peer" || message.revision <= this.revision) return;
    if (message.transaction.brokerEpoch !== this.brokerEpoch) { this.setStatus("connecting"); this.sendHello(); return; }
    if (message.revision !== this.revision + 1) { this.setStatus("connecting"); this.sendHello(); return; }
    const result = applyStudioTransaction(this.snapshot, message.transaction);
    if (result.conflicts.length) { this.openConflict(message.transaction, result, null, "Studio changes conflict with your local changes."); return; }
    this.revision = message.revision; this.snapshot = this.validate(result.snapshot); this.optimisticSnapshot = this.cloneSnapshot(this.optimisticSnapshot);
    const optimistic = applyStudioTransaction(this.optimisticSnapshot, message.transaction);
    if (!optimistic.conflicts.length) this.optimisticSnapshot = this.validate(optimistic.snapshot);
    this.options.onSnapshot(this.snapshot, "update"); this.refreshBrokerTimer();
  }
  private receiveReject(message: Extract<StudioSyncMessage, { kind: "reject" }>) {
    const operation = this.pending.get(message.requestId);
    if (operation) { this.pending.delete(message.requestId); clearTimeout(operation.timer); operation.reject(new Error(message.reason)); }
    this.revision = message.revision;
    this.snapshot = this.validate(message.snapshot);
    this.optimisticSnapshot = this.cloneSnapshot(this.snapshot);
    const queued = this.peerQueue.splice(0);
    queued.forEach((pending) => pending.reject(new Error("The previous Studio change could not be saved.")));
    if (message.conflicts.length) {
      this.openConflict(operation?.transaction ?? { transactionId: message.requestId, clientId: this.clientId, brokerEpoch: this.brokerEpoch, baseRevision: message.revision, changes: [] }, { snapshot: this.snapshot, conflicts: message.conflicts }, operation ?? null, message.reason);
    } else {
      this.options.onSnapshot(this.snapshot, "recovery");
      this.setStatus(this.role === "primary" ? "primary" : "synced");
    }
  }
  private openConflict(transaction: StudioSyncTransaction, result: { snapshot: T; conflicts: StudioSyncMergeConflict[] }, operation: PendingPeer | QueuedPrimary | null, reason: string) {
    this.conflict = { transaction, conflicts: result.conflicts, remoteSnapshot: this.cloneSnapshot(result.snapshot), localSnapshot: this.cloneSnapshot(this.optimisticSnapshot), operation, reason };
    this.setStatus("conflict"); this.options.onConflict?.(this.conflict);
  }
  private async processPeerQueue() {
    if (this.processingPeer || !this.isConnectedPeer()) return; this.processingPeer = true;
    try {
      while (this.peerQueue.length && this.isConnectedPeer()) {
        const operation = this.peerQueue.shift()!; this.pending.set(operation.requestId, operation); this.send({ ...this.base(), kind: "operation", requestId: operation.requestId, transaction: operation.transaction });
        await new Promise<void>(resolve => { const check = () => { if (!this.pending.has(operation.requestId)) resolve(); else setTimeout(check, 20); }; check(); });
      }
    } finally { this.processingPeer = false; }
  }
}

export function createStudioSync<T>(options: StudioSyncOptions<T>) { return new StudioSyncSession(options); }
