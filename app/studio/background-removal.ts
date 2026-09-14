/// <reference types="vite/client" />
import workerUrl from "./background-removal.worker.ts?worker&url";
import type { BackgroundRemovalMode } from "./background-removal-models";
export type BackgroundRemovalProgress = { message: string; percent?: number };
export type BackgroundRemovalResult = { blob: Blob; width: number; height: number };
export type BackgroundRemovalMessage =
  | { type: "progress"; progress: BackgroundRemovalProgress }
  | { type: "result"; result: BackgroundRemovalResult }
  | { type: "error"; message: string };

/** Each operation owns its worker. Termination also cancels download and inference. */
export function removeImageBackground(dataUrl: string, signal: AbortSignal, onProgress: (progress: BackgroundRemovalProgress) => void, mode: BackgroundRemovalMode = "general", edgeCleanup = .1): Promise<BackgroundRemovalResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Background removal cancelled.", "AbortError")); return; }
    if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") {
      reject(new Error("This browser does not support local background removal. Try an up-to-date Chrome, Edge, Firefox or Safari."));
      return;
    }
    const worker = new Worker(workerUrl, { type: "module" });
    const finish = () => { window.clearTimeout(timeout); signal.removeEventListener("abort", abort); worker.terminate(); };
    const abort = () => { finish(); reject(new DOMException("Background removal cancelled.", "AbortError")); };
    const timeout = window.setTimeout(() => { finish(); reject(new Error("Background removal took too long. Check your connection and try again with a smaller image.")); }, 180_000);
    signal.addEventListener("abort", abort, { once: true });
    worker.onerror = () => { finish(); reject(new Error("The local background removal engine could not start. Reload and try again.")); };
    worker.onmessageerror = () => { finish(); reject(new Error("The background removal result could not be read. Try again.")); };
    worker.onmessage = (event: MessageEvent<BackgroundRemovalMessage>) => {
      if (signal.aborted) return;
      if (event.data.type === "progress") onProgress(event.data.progress);
      else if (event.data.type === "result") { finish(); resolve(event.data.result); }
      else { finish(); reject(new Error(event.data.message)); }
    };
    worker.postMessage({ dataUrl, mode, edgeCleanup });
  });
}
