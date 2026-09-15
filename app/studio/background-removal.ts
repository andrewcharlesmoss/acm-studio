/// <reference types="vite/client" />
import workerUrl from "./background-removal.worker.ts?worker&url";
import type { BackgroundRemovalMode } from "./background-removal-models";
export type BackgroundRemovalProgress = { message: string; percent?: number };
export type BackgroundRemovalResult = { blob: Blob; width: number; height: number };
export type BackgroundRemovalMessage =
  | { type: "progress"; progress: BackgroundRemovalProgress }
  | { type: "result"; result: BackgroundRemovalResult }
  | { type: "error"; message: string };

let sharedWorker: Worker | null = null;
let activeOperation: {
  resolve: (result: BackgroundRemovalResult) => void;
  reject: (error: Error | DOMException) => void;
  onProgress: (progress: BackgroundRemovalProgress) => void;
  timeout: number;
  signal: AbortSignal;
  abort: () => void;
} | null = null;

function stopSharedWorker() {
  sharedWorker?.terminate();
  sharedWorker = null;
}

function settleOperation(error?: Error | DOMException, result?: BackgroundRemovalResult) {
  const operation = activeOperation;
  if (!operation) return;
  activeOperation = null;
  window.clearTimeout(operation.timeout);
  operation.signal.removeEventListener("abort", operation.abort);
  if (error) operation.reject(error);
  else if (result) operation.resolve(result);
}

function getSharedWorker() {
  if (sharedWorker) return sharedWorker;
  const worker = new Worker(workerUrl, { type: "module" });
  worker.onerror = () => {
    if (sharedWorker !== worker) return;
    const operation = activeOperation;
    stopSharedWorker();
    if (operation) settleOperation(new Error("The local background removal engine could not start. Reload and try again."));
  };
  worker.onmessageerror = () => {
    if (sharedWorker !== worker) return;
    const operation = activeOperation;
    stopSharedWorker();
    if (operation) settleOperation(new Error("The background removal result could not be read. Try again."));
  };
  worker.onmessage = (event: MessageEvent<BackgroundRemovalMessage>) => {
    if (sharedWorker !== worker) return;
    const operation = activeOperation;
    if (!operation) return;
    if (event.data.type === "progress") operation.onProgress(event.data.progress);
    else if (event.data.type === "result") settleOperation(undefined, event.data.result);
    else {
      stopSharedWorker();
      settleOperation(new Error(event.data.message));
    }
  };
  sharedWorker = worker;
  return worker;
}

/** Reuses one worker/session while Studio is open; the worker also persists verified models in Cache Storage. */
export function removeImageBackground(dataUrl: string, signal: AbortSignal, onProgress: (progress: BackgroundRemovalProgress) => void, mode: BackgroundRemovalMode = "general", edgeCleanup = .1): Promise<BackgroundRemovalResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Background removal cancelled.", "AbortError")); return; }
    if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") {
      reject(new Error("This browser does not support local background removal. Try an up-to-date Chrome, Edge, Firefox or Safari."));
      return;
    }
    if (activeOperation) { reject(new Error("Background removal is already processing another image.")); return; }
    const worker = getSharedWorker();
    const abort = () => {
      stopSharedWorker();
      settleOperation(new DOMException("Background removal cancelled.", "AbortError"));
    };
    const timeout = window.setTimeout(() => {
      stopSharedWorker();
      settleOperation(new Error("Background removal took too long. Check your connection and try again with a smaller image."));
    }, 180_000);
    activeOperation = { resolve, reject, onProgress, timeout, signal, abort };
    signal.addEventListener("abort", abort, { once: true });
    worker.postMessage({ dataUrl, mode, edgeCleanup });
  });
}
