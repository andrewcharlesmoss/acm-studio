import { validateDesignProject, type DesignProject } from "./design-model";

export const DESIGN_SYNC_PROTOCOL = "acm-studio-design-sync-v1" as const;
export const MAX_DESIGN_SYNC_BYTES = 8_000_000;
const HELLO_TIMEOUT_MS = 2_500;
const OPERATION_TIMEOUT_MS = 5_000;
const HEARTBEAT_MS = 1_000;
const BROKER_TIMEOUT_MS = 3_500;

export type DesignSyncRole = "primary" | "peer";
export type DesignSyncStatus = "unsupported" | "connecting" | "primary" | "synced" | "conflict" | "disconnected";

type MessageBase = {
  protocol: typeof DESIGN_SYNC_PROTOCOL;
  designId: string;
  senderId: string;
};

export type DesignSyncMessage =
  | (MessageBase & { kind: "hello"; requestId: string })
  | (MessageBase & { kind: "welcome"; requestId: string; brokerEpoch: string; revision: number; snapshot: DesignProject })
  | (MessageBase & { kind: "operation"; requestId: string; brokerEpoch: string; baseRevision: number; snapshot: DesignProject })
  | (MessageBase & { kind: "update"; updateId: string; brokerEpoch: string; revision: number; snapshot: DesignProject })
  | (MessageBase & { kind: "ack"; requestId: string; brokerEpoch: string; revision: number })
  | (MessageBase & { kind: "reject"; requestId: string; brokerEpoch: string; revision: number; reason: string; snapshot: DesignProject })
  | (MessageBase & { kind: "announce"; brokerEpoch: string; revision: number })
  | (MessageBase & { kind: "status"; brokerEpoch: string; revision: number; state: "primary" });

export type DesignSyncChannel = {
  postMessage(message: DesignSyncMessage): void;
  addEventListener(type: "message" | "messageerror", listener: (event: { data: unknown }) => void): void;
  removeEventListener(type: "message" | "messageerror", listener: (event: { data: unknown }) => void): void;
  close(): void;
};

export type DesignSyncOptions = {
  designId: string;
  initialSnapshot: DesignProject;
  role: DesignSyncRole;
  onSnapshot: (snapshot: DesignProject, source: "welcome" | "update" | "conflict") => void;
  onStatus?: (status: DesignSyncStatus) => void;
  persistPrimary: (snapshot: DesignProject) => Promise<void>;
  channelFactory?: (name: string) => DesignSyncChannel | null;
  clientId?: string;
};

type PendingPeerOperation = { requestId: string; resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
type QueuedPrimaryOperation = {
  requestId: string;
  senderId: string;
  baseRevision: number;
  snapshot: DesignProject;
  local: boolean;
  resolve?: () => void;
  reject?: (error: Error) => void;
};

function id(prefix: string) {
  const randomUuid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomUuid}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDesignSnapshot(value: unknown, expectedId: string): value is DesignProject {
  if (!isRecord(value) || value.id !== expectedId) return false;
  try {
    if (JSON.stringify(value).length > MAX_DESIGN_SYNC_BYTES) return false;
    validateDesignProject(value);
    return true;
  } catch {
    return false;
  }
}

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= 180;
}

function isRevision(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function validateDesignSyncMessage(value: unknown, expectedDesignId?: string): DesignSyncMessage | null {
  if (!isRecord(value) || value.protocol !== DESIGN_SYNC_PROTOCOL || !isNonEmptyString(value.designId) || (expectedDesignId && value.designId !== expectedDesignId) || !isNonEmptyString(value.senderId) || !isNonEmptyString(value.kind)) return null;
  const designId = value.designId as string;
  if (value.kind === "hello" && isNonEmptyString(value.requestId)) return value as DesignSyncMessage;
  if (value.kind === "welcome" && isNonEmptyString(value.requestId) && isNonEmptyString(value.brokerEpoch) && isRevision(value.revision) && isDesignSnapshot(value.snapshot, designId)) return value as DesignSyncMessage;
  if (value.kind === "operation" && isNonEmptyString(value.requestId) && isNonEmptyString(value.brokerEpoch) && isRevision(value.baseRevision) && isDesignSnapshot(value.snapshot, designId)) return value as DesignSyncMessage;
  if (value.kind === "update" && isNonEmptyString(value.updateId) && isNonEmptyString(value.brokerEpoch) && isRevision(value.revision) && isDesignSnapshot(value.snapshot, designId)) return value as DesignSyncMessage;
  if (value.kind === "ack" && isNonEmptyString(value.requestId) && isNonEmptyString(value.brokerEpoch) && isRevision(value.revision)) return value as DesignSyncMessage;
  if (value.kind === "reject" && isNonEmptyString(value.requestId) && isNonEmptyString(value.brokerEpoch) && isRevision(value.revision) && isNonEmptyString(value.reason) && isDesignSnapshot(value.snapshot, designId)) return value as DesignSyncMessage;
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
  private readonly pendingPeer = new Map<string, PendingPeerOperation>();
  private readonly completedOperations = new Map<string, { accepted: boolean; revision: number; reason?: string }>();
  private primaryQueue: QueuedPrimaryOperation[] = [];
  private processingPrimary = false;
  private role: DesignSyncRole;
  private brokerEpoch = "";
  private revision = 0;
  private snapshot: DesignProject;
  private status: DesignSyncStatus;
  private helloTimer: ReturnType<typeof setTimeout> | null = null;
  private brokerTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private peerQueue: Promise<void> = Promise.resolve();
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
    this.status = "connecting";
    const factory = options.channelFactory ?? defaultChannelFactory;
    try { this.channel = factory(`acm-studio-design-${options.designId}`); } catch { this.channel = null; }
    if (!this.channel) {
      this.status = "unsupported";
      this.notifyStatus();
      return;
    }
    this.channel.addEventListener("message", this.onMessage);
    this.channel.addEventListener("messageerror", this.onMessageError);
    if (this.role === "primary") this.becomePrimary();
    else this.sendHello();
  }

  getStatus() { return this.status; }
  getRevision() { return this.revision; }
  isAvailable() { return this.channel !== null && !this.closed; }
  isPrimary() { return this.role === "primary" && this.isAvailable(); }
  isConnectedPeer() { return this.role === "peer" && this.status === "synced" && this.isAvailable(); }

  setRole(role: DesignSyncRole) {
    if (this.closed || this.role === role) return;
    this.role = role;
    if (!this.channel) {
      this.setStatus("unsupported");
      return;
    }
    if (role === "primary") this.becomePrimary();
    else {
      this.stopHeartbeat();
      this.brokerEpoch = "";
      this.setStatus("connecting");
      this.sendHello();
    }
  }

  submit(snapshot: DesignProject) {
    this.peerQueue = this.peerQueue.catch(() => undefined).then(() => this.submitOne(snapshot));
    return this.peerQueue;
  }

  commitPrimary(snapshot: DesignProject) {
    if (!this.isPrimary()) return Promise.reject(new Error("The design broker is not the primary persistence owner."));
    const queuedPeer = this.primaryQueue.some((item) => !item.local);
    const baseRevision = this.revision + (queuedPeer ? 0 : this.primaryQueue.length);
    const validated = this.validateSnapshot(snapshot);
    return new Promise<void>((resolve, reject) => {
      this.primaryQueue.push({ requestId: id("local"), senderId: this.clientId, baseRevision, snapshot: validated, local: true, resolve, reject });
      void this.processPrimaryQueue();
    });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.helloTimer) clearTimeout(this.helloTimer);
    if (this.brokerTimer) clearTimeout(this.brokerTimer);
    this.stopHeartbeat();
    this.pendingPeer.forEach((pending) => { clearTimeout(pending.timer); pending.reject(new Error("The design broker closed.")); });
    this.pendingPeer.clear();
    this.channel?.removeEventListener("message", this.onMessage);
    this.channel?.removeEventListener("messageerror", this.onMessageError);
    this.channel?.close();
  }

  private validateSnapshot(snapshot: DesignProject) {
    if (!isDesignSnapshot(snapshot, this.options.designId)) throw new Error("The design update is invalid or too large for tab synchronisation.");
    return snapshot;
  }

  private notifyStatus() { this.options.onStatus?.(this.status); }

  private setStatus(status: DesignSyncStatus) {
    if (this.status === status) return;
    this.status = status;
    this.notifyStatus();
    if (status === "disconnected") this.failPending(new Error("The primary Studio tab stopped responding."));
  }

  private failPending(error: Error) {
    this.pendingPeer.forEach((pending) => {
      clearTimeout(pending.timer);
      pending.reject(error);
    });
    this.pendingPeer.clear();
  }

  private send(message: DesignSyncMessage) {
    if (!this.channel || this.closed) return;
    try { this.channel.postMessage(message); } catch { this.setStatus("disconnected"); }
  }

  private announce(kind: "announce" | "status") {
    this.send({ protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind, brokerEpoch: this.brokerEpoch, revision: this.revision, ...(kind === "status" ? { state: "primary" as const } : {}) } as DesignSyncMessage);
  }

  private becomePrimary() {
    this.brokerEpoch = id("epoch");
    this.setStatus("primary");
    this.announce("announce");
    this.announce("status");
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => this.announce("status"), HEARTBEAT_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private sendHello() {
    if (!this.channel || this.closed) return;
    const requestId = id("hello");
    this.send({ protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "hello", requestId });
    if (this.helloTimer) clearTimeout(this.helloTimer);
    this.helloTimer = setTimeout(() => {
      if (this.role === "peer" && this.status === "connecting") this.setStatus("disconnected");
    }, HELLO_TIMEOUT_MS);
  }

  private refreshBrokerTimer() {
    if (this.brokerTimer) clearTimeout(this.brokerTimer);
    this.brokerTimer = setTimeout(() => {
      if (this.role === "peer") this.setStatus("disconnected");
    }, BROKER_TIMEOUT_MS);
  }

  private handleMessage(message: DesignSyncMessage) {
    if (message.kind === "hello") { if (this.isPrimary()) this.sendWelcome(message); return; }
    if (message.kind === "announce") {
      if (this.role === "peer" && message.brokerEpoch !== this.brokerEpoch) {
        this.brokerEpoch = message.brokerEpoch;
        this.revision = message.revision;
        this.setStatus("connecting");
        this.sendHello();
      }
      return;
    }
    if (message.kind === "status") {
      if (this.role === "peer" && (!this.brokerEpoch || message.brokerEpoch === this.brokerEpoch)) {
        this.brokerEpoch = message.brokerEpoch;
        this.refreshBrokerTimer();
        if (this.status !== "synced") this.sendHello();
      }
      return;
    }
    if (message.kind === "welcome") { this.receiveWelcome(message); return; }
    if (message.kind === "operation") { if (this.isPrimary()) void this.receiveOperation(message); return; }
    if (message.kind === "update") { this.receiveUpdate(message); return; }
    if (message.kind === "ack") { this.receiveAck(message); return; }
    if (message.kind === "reject") { this.receiveReject(message); }
  }

  private sendWelcome(message: Extract<DesignSyncMessage, { kind: "hello" }>) {
    this.send({ protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "welcome", requestId: message.requestId, brokerEpoch: this.brokerEpoch, revision: this.revision, snapshot: this.snapshot });
  }

  private receiveWelcome(message: Extract<DesignSyncMessage, { kind: "welcome" }>) {
    if (this.role !== "peer") return;
    if (this.brokerEpoch && this.brokerEpoch !== message.brokerEpoch && this.status === "synced") return;
    this.brokerEpoch = message.brokerEpoch;
    this.revision = message.revision;
    this.snapshot = message.snapshot;
    if (this.helloTimer) clearTimeout(this.helloTimer);
    this.refreshBrokerTimer();
    this.setStatus("synced");
    this.options.onSnapshot(message.snapshot, "welcome");
  }

  private async receiveOperation(message: Extract<DesignSyncMessage, { kind: "operation" }>) {
    const previous = this.completedOperations.get(message.requestId);
    if (previous) {
      this.send(previous.accepted ? { protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "ack", requestId: message.requestId, brokerEpoch: this.brokerEpoch, revision: previous.revision } : { protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "reject", requestId: message.requestId, brokerEpoch: this.brokerEpoch, revision: previous.revision, reason: previous.reason ?? "Duplicate operation.", snapshot: this.snapshot });
      return;
    }
    if (message.brokerEpoch !== this.brokerEpoch || message.baseRevision !== this.revision) {
      this.rememberOperation(message.requestId, false, "The design changed in another tab.");
      this.sendReject(message.requestId, "The design changed in another tab.");
      return;
    }
    this.primaryQueue.push({ requestId: message.requestId, senderId: message.senderId, baseRevision: message.baseRevision, snapshot: message.snapshot, local: false });
    await this.processPrimaryQueue();
  }

  private async processPrimaryQueue() {
    if (this.processingPrimary) return;
    this.processingPrimary = true;
    try {
      while (this.primaryQueue.length) {
        const operation = this.primaryQueue.shift()!;
        if (operation.baseRevision !== this.revision) {
          const error = new Error("The design changed in another tab.");
          if (!operation.local) {
            this.rememberOperation(operation.requestId, false, error.message);
            this.sendReject(operation.requestId, error.message);
          } else {
            this.options.onSnapshot(this.snapshot, "conflict");
            operation.reject?.(error);
          }
          continue;
        }
        try {
          await this.options.persistPrimary(operation.snapshot);
          this.snapshot = operation.snapshot;
          this.revision += 1;
          if (!operation.local) this.options.onSnapshot(this.snapshot, "update");
          this.send({ protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "update", updateId: id("update"), brokerEpoch: this.brokerEpoch, revision: this.revision, snapshot: this.snapshot });
          if (!operation.local) {
            this.rememberOperation(operation.requestId, true, undefined, this.revision);
            this.send({ protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "ack", requestId: operation.requestId, brokerEpoch: this.brokerEpoch, revision: this.revision });
          }
          operation.resolve?.();
        } catch (caughtError) {
          const error = caughtError instanceof Error ? caughtError : new Error(isRecord(caughtError) && typeof caughtError.message === "string" ? caughtError.message : "The design could not be saved.");
          if (!operation.local) {
            this.rememberOperation(operation.requestId, false, error.message);
            this.sendReject(operation.requestId, error.message);
          } else {
            this.options.onSnapshot(this.snapshot, "conflict");
            operation.reject?.(error);
          }
        }
      }
    } finally { this.processingPrimary = false; }
  }

  private rememberOperation(requestId: string, accepted: boolean, reason?: string, revision = this.revision) {
    this.completedOperations.set(requestId, { accepted, revision, reason });
    if (this.completedOperations.size > 100) this.completedOperations.delete(this.completedOperations.keys().next().value!);
  }

  private sendReject(requestId: string, reason: string) {
    this.send({ protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "reject", requestId, brokerEpoch: this.brokerEpoch, revision: this.revision, reason, snapshot: this.snapshot });
  }

  private receiveUpdate(message: Extract<DesignSyncMessage, { kind: "update" }>) {
    if (this.role !== "peer" || message.brokerEpoch !== this.brokerEpoch || message.revision <= this.revision) return;
    if (message.revision !== this.revision + 1) {
      this.setStatus("conflict");
      this.options.onSnapshot(this.snapshot, "conflict");
      this.sendHello();
      return;
    }
    this.revision = message.revision;
    this.snapshot = message.snapshot;
    this.refreshBrokerTimer();
    this.setStatus("synced");
    this.options.onSnapshot(message.snapshot, "update");
  }

  private async submitOne(snapshot: DesignProject) {
    if (!this.isConnectedPeer()) throw new Error("The design is not connected to its primary Studio tab.");
    const validated = this.validateSnapshot(snapshot);
    const requestId = id("operation");
    const baseRevision = this.revision;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingPeer.delete(requestId);
        this.setStatus("disconnected");
        reject(new Error("The primary Studio tab stopped responding."));
      }, OPERATION_TIMEOUT_MS);
      this.pendingPeer.set(requestId, { requestId, resolve, reject, timer });
      this.send({ protocol: DESIGN_SYNC_PROTOCOL, designId: this.options.designId, senderId: this.clientId, kind: "operation", requestId, brokerEpoch: this.brokerEpoch, baseRevision, snapshot: validated });
    });
  }

  private receiveAck(message: Extract<DesignSyncMessage, { kind: "ack" }>) {
    if (this.role !== "peer" || message.brokerEpoch !== this.brokerEpoch) return;
    const pending = this.pendingPeer.get(message.requestId);
    if (!pending) return;
    if (message.revision !== this.revision) {
      clearTimeout(pending.timer); this.pendingPeer.delete(message.requestId);
      this.setStatus("conflict");
      pending.reject(new Error("The design revision changed before the operation was acknowledged."));
      this.sendHello();
      return;
    }
    clearTimeout(pending.timer); this.pendingPeer.delete(message.requestId); this.revision = message.revision; pending.resolve(); this.refreshBrokerTimer(); this.setStatus("synced");
  }

  private receiveReject(message: Extract<DesignSyncMessage, { kind: "reject" }>) {
    if (this.role !== "peer" || message.brokerEpoch !== this.brokerEpoch) return;
    const pending = this.pendingPeer.get(message.requestId);
    if (!pending) return;
    clearTimeout(pending.timer); this.pendingPeer.delete(message.requestId);
    if (message.revision < this.revision) {
      this.setStatus("conflict");
      pending.reject(new Error("The design broker returned an older revision."));
      this.sendHello();
      return;
    }
    this.revision = message.revision; this.snapshot = message.snapshot; this.setStatus("conflict"); this.options.onSnapshot(message.snapshot, "conflict"); pending.reject(new Error(message.reason));
  }
}

export function createDesignSync(options: DesignSyncOptions) {
  return new DesignSyncSession(options);
}
