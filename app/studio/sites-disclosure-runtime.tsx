"use client";
import { useEffect } from "react";
import { startSitesDisclosureHost } from "./sites-disclosure-broker.mjs";

export function SitesDisclosureRuntime() {
  useEffect(startSitesDisclosureHost, []);
  return null;
}
