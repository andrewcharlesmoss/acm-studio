"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { studioWriteOwnership } from "../write-ownership";
import { useTestSite } from "./use-test-site";

function LocalSiteBrokers() {
  const ownership = useSyncExternalStore(studioWriteOwnership.subscribe, studioWriteOwnership.getState, () => "waiting");
  // These hooks wake only when a site editor asks for its broker. They borrow
  // the existing owner and never acquire a second lock or expose editor state.
  useTestSite(false, ownership === "writable", "test");
  useTestSite(false, ownership === "writable", "test2");
  return null;
}

export function LocalSiteBrokerRuntime() {
  const pathname = usePathname();
  // The ordinary shell owns its editable hooks. Other Studio routes, including
  // Design Canvas, must also serve site peers whenever they hold the same lock.
  return pathname === "/studio" || pathname === "/studio/" ? null : <LocalSiteBrokers />;
}
