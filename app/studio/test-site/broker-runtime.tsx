"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { studioWriteOwnership } from "../write-ownership";
import { useTestSite } from "./use-test-site";
import { GLOBAL_TEMPLATE_WAKE_CHANNEL, GLOBAL_TEMPLATE_WAKE_MESSAGE, useGlobalTemplates } from "../use-global-templates";

function LocalSiteBrokers() {
  const ownership = useSyncExternalStore(studioWriteOwnership.subscribe, studioWriteOwnership.getState, () => "waiting");
  const [globalRequested, setGlobalRequested] = useState(false);
  useEffect(() => {
    if (typeof BroadcastChannel !== "function") return;
    const channel = new BroadcastChannel(GLOBAL_TEMPLATE_WAKE_CHANNEL);
    const wake = (event: MessageEvent<unknown>) => {
      if (JSON.stringify(event.data) === JSON.stringify(GLOBAL_TEMPLATE_WAKE_MESSAGE) && studioWriteOwnership.canWrite()) setGlobalRequested(true);
    };
    channel.addEventListener("message", wake);
    return () => { channel.removeEventListener("message", wake); channel.close(); };
  }, []);
  // These hooks wake only when a site editor asks for its broker. They borrow
  // the existing owner and never acquire a second lock or expose editor state.
  const firstSite = useTestSite(globalRequested, ownership === "writable", "test");
  useTestSite(false, ownership === "writable", "test2");
  // Global originals borrow Test's existing private gateway authority, while
  // retaining their own revision and typed synchronisation room.
  useGlobalTemplates(firstSite, globalRequested && ownership === "writable", ownership === "writable");
  return null;
}

export function LocalSiteBrokerRuntime() {
  const pathname = usePathname();
  // The ordinary shell owns its editable hooks. Other Studio routes, including
  // Design Canvas, must also serve site peers whenever they hold the same lock.
  return pathname === "/studio" || pathname === "/studio/" ? null : <LocalSiteBrokers />;
}
