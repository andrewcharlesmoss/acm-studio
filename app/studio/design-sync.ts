import { applyDesignTransaction, createDesignTransaction, DESIGN_SYNC_PROTOCOL, resolveDesignConflicts, validateDesignTransaction, type DesignMergeConflict, type DesignMergeResult, type DesignTransaction } from "./design-merge";
import { cloneDesign, validateDesignProject, type DesignProject } from "./design-model";

export { DESIGN_SYNC_PROTOCOL } from "./design-merge";
export type DesignSyncRole = "primary" | "peer";
export type DesignSyncStatus = "unsupported" | "connecting" | "primary" | "synced" | "conflict" | "disconnected";
export type DesignSyncSnapshotSource = "welcome" | "update" | "commit" | "conflict";

type MessageBase = { protocol: typeof DESIGN_SYNC_PROTOCOL; designId: string; senderId: string };

export type DesignSyncMessage =
  | (MessageBase & { kind: "hello"; requestId: string })
  | (MessageBase & { kind: "welcome"; requestId: string; brokerEpoch: string; revision: number; snapshot: DesignProject })
  | (MessageBase & { kind: "operation"; requestId: string; transaction: DesignTransaction })
  | (MessageBase & { kind: "update"; updateId: string; revision: number; transaction: DesignTransaction })
  | (MessageBase & { kind: "ack"; requestId: string; revision: number })
  | (MessageBase & { kind: "reject"; requestId: string; revision: number; reason: string; snapshot: DesignProject; conflicts?: DesignMergeConflict[] })
  | (MessageBase & { kind: "announce"; brokerEpoch: string; revision: number })
  | (MessageBase & { kind: "status"; brokerEpoch: string; revision: number; state: "primary" });

export type DesignSyncChannel = {
  postMessage(message: DesignSyncMessage): void;
  addEventListener(type: "message" | "messageerror", listener: (event: { data: unknown }) => void): void;
  removeEventListener(type: "message" | "messageerror", listener: (event: { data: unknown }) => void): void;
  close(): void;
};

export type DesignSyncConflict = {
  transaction: DesignTransaction;
  result: DesignMergeResult;
  remoteSnapshot: DesignProject;
  localSnapshot: DesignProject;
  reason: string;
};

export type DesignSyncOptions = {
  designId: string;
  initialSnapshot: DesignProject;
  role: DesignSyncRole;
  onSnapshot: (snapshot: DesignProject, source: DesignSyncSnapshotSource) => void;
  onConflict?: (conflict: DesignSyncConflict) => void;
  onStatus?: (status: DesignSyncStatus) => void;
  persistPrimary: (snapshot: DesignProject) => Promise<void>;
  channelFactory?: (name: string) => DesignSyncChannel | null;
  clientId?: string;
};

type PendingPeerOperation = { requestId: string; transaction: DesignTransaction; resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
type QueuedPrimaryOperation = { requestId?: string; transaction: DesignTransaction; local: boolean; resolve?: () => void; reject?: (error: Error) => void };
type ConflictState = DesignSyncConflict & { operation: PendingPeerOperation | QueuedPrimaryOperation | null };

const MAX_DESIGN_SYNC_BYTES = 8_000_000;
const HELLO_TIMEOUT_MS = 2_500;
const OPERATION_TIMEOUT_MS = 5_000;
const HEARTBEAT_MS = 1_000;
const BROKER_TIMEOUT_MS = 3_500;

function id(prefix: string) {
  const randomUuid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomUuid}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= 180;
}

function isRevision(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isTransaction(value: unknown, expectedDesignId: string): value is DesignTransaction {
  try { validateDesignTransaction(value, expectedDesignId); return true; } catch { return false; }
}

function isDesignSnapshot(value: unknown, expectedId: string): value is DesignProject {
  if (!isRecord(value) || value.id !== expectedId) return false;
  try {
    if (JSON.stringify(value).length > MAX_DESIGN_SYNC_BYTES) return false;
    validateDesignProject(value);
    return true;
  } catch { return false; }
}

export function validateDesignSyncMessage(value: unknown, expectedDesignId?: string): DesignSyncMessage | null {
  if (!isRecord(value) || value.protocol !== DESIGN_SYNC_PROTOCOL || !isNonEmptyString(value.designId) || (expectedDesignId && value.designId !== expectedDesignId) || !isNonEmptyString(value.senderId) || !isNonEmptyString(value.kind)) return null;
  const designId = value.designId as string;
  if (value.kind === "hello" && isNonEmptyString(value.requestId)) return value as DesignSyncMessage;
  if (value.kind === "welcome" && isNonEmptyString(value.requestId) && isNonEmptyString(value.brokerEpoch) && isRevision(value.revision) && isDesignSnapshot(value.snapshot, designId)) return value as DesignSyncMessage;
  if (value.kind === "operation" && isNonEmptyString(value.requestId) && isTransaction(value.transaction, designId)) return value as DesignSyncMessage;
  if (value.kind === "update" && isNonEmptyString(value.updateId) && isRevision(value.revision) && isTransaction(value.transaction, designId)) return value as DesignSyncMessage;
  if (value.kind === "ack" && isNonEmptyString(value.requestId) && isRevision(value.revision)) return value as DesignSyncMessage;
  if (value.kind === "reject" && isNonEmptyString(value.requestId) && isRevision(value.revision) && isNonEmptyString(value.reason) && isDesignSnapshot(value.snapshot, designId)) return value as DesignSyncMessage;
  if (value.kind === "announce" && isNonEmptyString(value.brokerEpoch) && isRevision(value.revision)) return value as DesignSyncMessage;
  if (value.kind === "status" && isNonEmptyString(value.brokerEpoch) && isRevision(value.revision) && value.state === "primary") return value as DesignSyncMessage;
  return null;
}

function defaultChannelFactory(name: string): DesignSyncChannel | null {
  if (typeof globalThis.BroadcastChannel !== "function") return null;
  return new globalThis.BroadcastChannel(name) as unknown as DesignSyncChannel;
}

export class DesignSyncSession {
  private readonly options: DesignSyncOptions;
  private readonly clientId: string;
  private readonly channel: DesignSyncChannel | null;
  private readonly completedOperations = new Map<string, { accepted: boolean; revision: number; reason?: string }>();
  private readonly pendingPeer = new Map<string, PendingPeerOperation>();
  private peerQueue: PendingPeerOperation[] = [];
  private primaryQueue: QueuedPrimaryOperation[] = [];
  private processingPrimary = false;
  private processingPeer = false;
  private role: DesignSyncRole;
  private brokerEpoch = "";
  private revision = 0;
  private snapshot: DesignProject;
  private optimisticSnapshot: DesignProject;
  private status: DesignSyncStatus;
  private conflict: ConflictState | null = null;
  private helloTimer: ReturnType<typeof setTimeout> | null = null;
  private brokerTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;

  private readonly onMessage = (event: { data: unknown }) => {
    const message = validateDesignSyncMessage(event.data, this.options.designId);
    if (!message || message.senderId === this.clientId || this.closed) return;
    this.handleMessage(message);
  };
  private readonly onMessageError = () => this.setStatus("disconnected");

  constructor(options: DesignSyncOptions) {
    this.options = options;
    this.clientId = options.clientId ?? id("client");
    this.role = options.role;
    this.snapshot = this.validateSnapshot(options.initialSnapshot);
    this.optimisticSnapshot = cloneDesign(this.snapshot);
    this.status = "connecting";
    const factory = options.channelFactory ?? defaultChannelFactory;
    try { this.channel = factory(`acm-studio-design-${options.designId}`); } catch { this.channel = null; }
    if (!this.channel) { this.status = "unsupported"; this.notifyStatus(); return; }
    this.channel.addEventListener("message", this.onMessage);
    this.channel.addEventListener("messageerror", this.onMessageError);
    if (this.role === "primary") this.becomePrimary(); else this.sendHello();
  }

  getStatus() { return this.status; }
  getRevision() { return this.revision; }
  getConflict() { return this.conflict; }
  isAvailable() { return this.channel !== null && !this.closed; }
  isPrimary() { return this.role === "primary" && this.isAvailable(); }
  isConnectedPeer() { return this.role === "peer" && this.status === "synced" && this.isAvailable() && !this.conflict; }

  setRole(role: DesignSyncRole) {
    if (this.closed || this.role === role) return;
    this.role = role;
    if (!this.channel) { this.setStatus("unsupported"); return; }
    if (role === "primary") this.becomePrimary();
    else { this.stopHeartbeat(); this.brokerEpoch = ""; this.setStatus("connecting"); this.sendHello(); }
  }

  submit(snapshot: DesignProject) {
    if (!this.isConnectedPeer()) return Promise.reject(new Error("The design is not connected to its primary Studio tab."));
    const validated = this.validateSnapshot(snapshot);
    const transaction = this.makeTransaction(this.optimisticSnapshot, validated, this.revision + this.peerQueue.length + this.pendingPeer.size);
    this.optimisticSnapshot = cloneDesign(validated);
    if (!transaction.changes.length) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const queued: PendingPeerOperation = { requestId: id("operation"), transaction, resolve, reject, timer: setTimeout(() => undefined, 0) };
      clearTimeout(queued.timer);
      this.peerQueue.push(queued);
      void this.processPeerQueue();
    });
  }

  commitPrimary(snapshot: DesignProject) {
    if (!this.isPrimary()) return Promise.reject(new Error("The design broker is not the primary persistence owner."));
    const validated = this.validateSnapshot(snapshot);
    const transaction = this.makeTransaction(this.optimisticSnapshot, validated, this.revision + this.primaryQueue.length);
    this.optimisticSnapshot = cloneDesign(validated);
    if (!transaction.changes.length) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      this.primaryQueue.push({ transaction, local: true, resolve, reject });
      void this.processPrimaryQueue();
    });
  }

  resolveConflict(choice: "mine" | "theirs") {
    if (!this.conflict || this.closed) return Promise.reject(new Error("There is no design conflict to resolve."));
    const conflict = this.conflict;
    const candidate = choice === "mine" ? resolveDesignConflicts(conflict.result.snapshot, conflict.transaction, conflict.result, "mine") : conflict.result.snapshot;
    this.conflict = null;
    this.setStatus(this.role === "primary" ? "primary" : "synced");
    const transaction = this.makeTransaction(this.snapshot, candidate, this.revision);
    if (this.role === "primary") {
      return new Promise<void>((resolve, reject) => {
        this.primaryQueue.unshift({ transaction, local: true, resolve: () => {
          if (conflict.operation && "resolve" in conflict.operation) conflict.operation.resolve?.();
          resolve();
        }, reject: (error) => {
          if (conflict.operation && "reject" in conflict.operation) conflict.operation.reject?.(error);
          reject(error);
        } });
        void this.processPrimaryQueue();
      });
    }
    return new Promise<void>((resolve, reject) => {
      if (conflict.operation && "requestId" in conflict.operation && typeof conflict.operation.requestId === "string") {
        if ("timer" in conflict.operation) clearTimeout(conflict.operation.timer);
        this.pendingPeer.delete(conflict.operation.requestId);
      }
      const queued: PendingPeerOperation = { requestId: id("resolution"), transaction, resolve: () => {
        if (conflict.operation && "resolve" in conflict.operation) conflict.operation.resolve?.();
        resolve();
      }, reject: (error) => {
        if (conflict.operation && "reject" in conflict.operation) conflict.operation.reject?.(error);
        reject(error);
      }, timer: setTimeout(() => undefined, 0) };
      clearTimeout(queued.timer);
      this.peerQueue.unshift(queued);
      this.optimisticSnapshot = cloneDesign(candidate);
      void this.processPeerQueue();
    });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.helloTimer) clearTimeout(this.helloTimer);
    if (this.brokerTimer) clearTimeout(this.brokerTimer);
    this.stopHeartbeat();
    this.pendingPeer.forEach((pending) => { clearTimeout(pending.timer); pending.reject(new Error("The design broker closed.")); });
    this.peerQueue.forEach((pending) => pending.reject(new Error("The design broker closed.")));
    this.pendingPeer.clear(); this.peerQueue = [];
    this.channel?.removeEventListener("message", this.onMessage);
    this.channel?.removeEventListener("messageerror", this.onMessageError);
    this.channel?.close();
  }

  private validateSnapshot(snapshot: DesignProject) {
    if (!isDesignSnapshot(snapshot, this.options.designId)) throw new Error("The design update is invalid or too large for tab synchronisation.");
    return cloneDesign(snapshot);
  }

  private makeTransaction(before: DesignProject, after: DesignProject, baseRevision: number) {
    return createDesignTransaction(before, after, { transactionId: id("transaction"), clientId: this.clientId, brokerEpoch: this.brokerEpoch, baseRevision });
  }

  private notifyStatus() { this.options.onStatus?.(this.status); }
  private setStatus(status: DesignSyncStatus) {
    if (this.status === status) return;
    this.status = status;
    this.notifyStatus();
    if (status === "disconnected") this.failPending(new Error("The primary Studio tab stopped responding."));
  }
  private failPending(error: Error) {
    this.pendingPeer.forEach((pending) => { clearTimeout(pending.timer); pending.reject(error); });
    this.pendingPeer.clear();
  }
  private send(message: DesignSyncMessage) { if (!this.channel || this.closed) return; try { this.channel.postMessage(message); } catch { this.setStatus("disconnected"); } }
  private announce(kind: "announce" | "status") { this.send({ protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind, brokerEpoch: this.brokerEpoch, revision: this.revision, ...(kind === "status" ? { state: "primary" as const } : {}) } as DesignSyncMessage); }
  private becomePrimary() {
    this.brokerEpoch = id("epoch");
    this.setStatus("primary");
    this.announce("announce"); this.announce("status");
    this.stopHeartbeat(); this.heartbeatTimer = setInterval(() => this.announce("status"), HEARTBEAT_MS);
  }
  private stopHeartbeat() { if (this.heartbeatTimer) clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  private sendHello() {
    if (!this.channel || this.closed) return;
    const requestId = id("hello");
    this.send({ protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "hello", requestId });
    if (this.helloTimer) clearTimeout(this.helloTimer);
    this.helloTimer = setTimeout(() => { if (this.role === "peer" && this.status === "connecting") this.setStatus("disconnected"); }, HELLO_TIMEOUT_MS);
  }
  private refreshBrokerTimer() {
    if (this.brokerTimer) clearTimeout(this.brokerTimer);
    this.brokerTimer = setTimeout(() => { if (this.role === "peer") this.setStatus("disconnected"); }, BROKER_TIMEOUT_MS);
  }
  private handleMessage(message: DesignSyncMessage) {
    if (message.kind === "hello") { if (this.isPrimary()) this.sendWelcome(message); return; }
    if (message.kind === "announce") { if (this.role === "peer" && message.brokerEpoch !== this.brokerEpoch) { this.brokerEpoch = message.brokerEpoch; this.revision = message.revision; this.setStatus("connecting"); this.sendHello(); } return; }
    if (message.kind === "status") { if (this.role === "peer" && (!this.brokerEpoch || message.brokerEpoch === this.brokerEpoch)) { this.brokerEpoch = message.brokerEpoch; this.refreshBrokerTimer(); if (this.status !== "synced") this.sendHello(); } return; }
    if (message.kind === "welcome") { this.receiveWelcome(message); return; }
    if (message.kind === "operation") { if (this.isPrimary()) void this.receiveOperation(message); return; }
    if (message.kind === "update") { this.receiveUpdate(message); return; }
    if (message.kind === "ack") { this.receiveAck(message); return; }
    if (message.kind === "reject") this.receiveReject(message);
  }
  private sendWelcome(message: Extract<DesignSyncMessage, { kind: "hello" }>) { this.send({ protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "welcome", requestId: message.requestId, brokerEpoch: this.brokerEpoch, revision: this.revision, snapshot: this.snapshot }); }
  private receiveWelcome(message: Extract<DesignSyncMessage, { kind: "welcome" }>) {
    if (this.role !== "peer") return;
    if (this.brokerEpoch && this.brokerEpoch !== message.brokerEpoch && this.status === "synced") return;
    this.brokerEpoch = message.brokerEpoch; this.revision = message.revision; this.snapshot = message.snapshot; this.optimisticSnapshot = cloneDesign(message.snapshot);
    if (this.helloTimer) clearTimeout(this.helloTimer);
    this.refreshBrokerTimer(); this.setStatus("synced"); this.options.onSnapshot(message.snapshot, "welcome");
  }
  private async receiveOperation(message: Extract<DesignSyncMessage, { kind: "operation" }>) {
    const transaction = message.transaction;
    const previous = this.completedOperations.get(transaction.transactionId);
    if (previous) { this.send(previous.accepted ? { protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "ack", requestId: message.requestId, revision: previous.revision } : { protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "reject", requestId: message.requestId, revision: previous.revision, reason: previous.reason ?? "Duplicate operation.", snapshot: this.snapshot }); return; }
    if (transaction.brokerEpoch !== this.brokerEpoch || transaction.baseRevision > this.revision) { this.rememberOperation(transaction.transactionId, false, "The design revision is ahead of the primary tab."); this.sendReject(message.requestId, transaction, "The design revision is ahead of the primary tab.", []); return; }
    this.primaryQueue.push({ requestId: message.requestId, transaction, local: false });
    await this.processPrimaryQueue();
  }
  private async processPrimaryQueue() {
    if (this.processingPrimary) return;
    this.processingPrimary = true;
    try {
      while (this.primaryQueue.length) {
        const operation = this.primaryQueue.shift()!;
        const result = applyDesignTransaction(this.snapshot, operation.transaction);
        if (result.conflicts.length) {
          const error = new Error("The design changed in another Studio tab.");
          if (operation.local) this.openConflict(operation.transaction, result, this.optimisticSnapshot, error.message, operation);
          else { this.rememberOperation(operation.transaction.transactionId, false, error.message); this.sendReject(operation.requestId ?? operation.transaction.transactionId, operation.transaction, error.message, result.conflicts); }
          continue;
        }
        try {
          await this.options.persistPrimary(result.snapshot);
          this.snapshot = result.snapshot; this.optimisticSnapshot = cloneDesign(result.snapshot); this.revision += 1;
          this.options.onSnapshot(this.snapshot, operation.local ? "commit" : "update");
          this.send({ protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "update", updateId: id("update"), revision: this.revision, transaction: { ...operation.transaction, baseRevision: this.revision - 1, brokerEpoch: this.brokerEpoch } });
          if (!operation.local) { this.rememberOperation(operation.transaction.transactionId, true, undefined, this.revision); this.send({ protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "ack", requestId: operation.requestId ?? operation.transaction.transactionId, revision: this.revision }); }
          operation.resolve?.();
        } catch (caughtError) {
          const error = caughtError instanceof Error ? caughtError : new Error("The design could not be saved.");
          if (!operation.local) { this.rememberOperation(operation.transaction.transactionId, false, error.message); this.sendReject(operation.requestId ?? operation.transaction.transactionId, operation.transaction, error.message, []); }
          else { this.openConflict(operation.transaction, { snapshot: this.snapshot, conflicts: [] }, this.optimisticSnapshot, error.message, operation); operation.reject?.(error); }
        }
      }
    } finally { this.processingPrimary = false; }
  }
  private rememberOperation(transactionId: string, accepted: boolean, reason?: string, revision = this.revision) { this.completedOperations.set(transactionId, { accepted, revision, reason }); if (this.completedOperations.size > 100) this.completedOperations.delete(this.completedOperations.keys().next().value!); }
  private sendReject(requestId: string, transaction: DesignTransaction, reason: string, conflicts: DesignMergeConflict[]) { this.send({ protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "reject", requestId, revision: this.revision, reason, snapshot: this.snapshot, conflicts }); }
  private receiveUpdate(message: Extract<DesignSyncMessage, { kind: "update" }>) {
    if (this.role !== "peer" || message.transaction.brokerEpoch !== this.brokerEpoch || message.revision <= this.revision) return;
    if (message.revision !== this.revision + 1) { this.setStatus("conflict"); this.openConflict(message.transaction, { snapshot: this.snapshot, conflicts: [] }, this.optimisticSnapshot, "The design revision sequence is incomplete.", null); this.sendHello(); return; }
    const result = applyDesignTransaction(this.snapshot, message.transaction);
    if (result.conflicts.length) { this.setStatus("conflict"); this.openConflict(message.transaction, result, this.optimisticSnapshot, "The committed change could not be applied to this tab.", null); return; }
    this.revision = message.revision; this.snapshot = result.snapshot; this.refreshBrokerTimer(); this.rebuildOptimistic();
  }
  private rebuildOptimistic() {
    let next = cloneDesign(this.snapshot);
    for (const pending of [...this.pendingPeer.values(), ...this.peerQueue]) {
      const result = applyDesignTransaction(next, pending.transaction);
      if (result.conflicts.length) { this.setStatus("conflict"); this.openConflict(pending.transaction, result, this.optimisticSnapshot, "Your change conflicts with a committed change.", pending); return; }
      next = result.snapshot;
    }
    this.optimisticSnapshot = next; this.setStatus("synced"); this.options.onSnapshot(next, "update");
  }
  private async processPeerQueue() {
    if (this.processingPeer || this.closed || this.conflict) return;
    this.processingPeer = true;
    try {
      while (this.peerQueue.length && !this.conflict) {
        const pending = this.peerQueue.shift()!;
        pending.transaction = { ...pending.transaction, baseRevision: this.revision, brokerEpoch: this.brokerEpoch };
        this.pendingPeer.set(pending.requestId, pending);
        pending.timer = setTimeout(() => { if (this.pendingPeer.delete(pending.requestId)) { this.setStatus("disconnected"); pending.reject(new Error("The primary Studio tab stopped responding.")); } }, OPERATION_TIMEOUT_MS);
        this.send({ protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "operation", requestId: pending.requestId, transaction: pending.transaction });
        await new Promise<void>((resolve) => { const check = () => { if (!this.pendingPeer.has(pending.requestId) || this.conflict) resolve(); else setTimeout(check, 0); }; check(); });
      }
    } finally { this.processingPeer = false; }
  }
  private receiveAck(message: Extract<DesignSyncMessage, { kind: "ack" }>) {
    if (this.role !== "peer") return;
    const pending = this.pendingPeer.get(message.requestId); if (!pending) return;
    if (message.revision < this.revision) { clearTimeout(pending.timer); this.pendingPeer.delete(message.requestId); this.openConflict(pending.transaction, { snapshot: this.snapshot, conflicts: [] }, this.optimisticSnapshot, "The design broker returned an older revision.", pending); return; }
    clearTimeout(pending.timer); this.pendingPeer.delete(message.requestId); pending.resolve(); this.setStatus("synced"); this.refreshBrokerTimer();
  }
  private receiveReject(message: Extract<DesignSyncMessage, { kind: "reject" }>) {
    if (this.role !== "peer") return;
    const pending = this.pendingPeer.get(message.requestId); if (!pending) return;
    clearTimeout(pending.timer); this.pendingPeer.delete(message.requestId); this.revision = message.revision; this.snapshot = message.snapshot;
    this.setStatus("conflict"); this.openConflict(pending.transaction, { snapshot: message.snapshot, conflicts: message.conflicts ?? [] }, this.optimisticSnapshot, message.reason, pending); pending.reject(new Error(message.reason));
  }
  private openConflict(transaction: DesignTransaction, result: DesignMergeResult, localSnapshot: DesignProject, reason: string, operation: PendingPeerOperation | QueuedPrimaryOperation | null) {
    this.conflict = { transaction, result, remoteSnapshot: result.snapshot, localSnapshot: cloneDesign(localSnapshot), reason, operation };
    this.setStatus("conflict"); this.options.onConflict?.(this.conflict);
  }
}

export function createDesignSync(options: DesignSyncOptions) { return new DesignSyncSession(options); }
