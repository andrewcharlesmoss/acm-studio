"use client";

import { useEffect, useSyncExternalStore } from "react";
import { studioWriteOwnership } from "./write-ownership";
import { createDesignBrokerHost } from "./design-broker-host";

export function DesignBrokerRuntime() {
  const ownership = useSyncExternalStore(studioWriteOwnership.subscribe, studioWriteOwnership.getState, () => "waiting");
  useEffect(() => {
    if (ownership !== "writable" || typeof BroadcastChannel !== "function") return;
    const host = createDesignBrokerHost({ canWrite: () => studioWriteOwnership.canWrite() });
    const refresh = () => { try { host.refresh(); } catch { /* Preserve invalid source for recovery. */ } };
    window.addEventListener("studio-designs-saved", refresh);
    return () => { window.removeEventListener("studio-designs-saved", refresh); host.close(); };
  }, [ownership]);
  return null;
}
