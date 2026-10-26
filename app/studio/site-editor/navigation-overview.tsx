"use client";

import { AcmIcon } from "@acm/icons/react";
import { StudioIcon } from "../studio-icons";
import "./navigation-overview.css";

/** Site-owned menu presentation; the host supplies authority and persistence. */
export function NavigationOverview({ siteName, ready, error, onOpen, onRetry }: {
  siteName: string; ready: boolean; error?: string | null;
  onOpen: () => void; onRetry?: () => void;
}) {
  return <section className="site-navigation-overview" aria-label={`${siteName} navigation menus`}>
    <p>Manage your website’s navigation menu.</p>
    {error ? <p role="alert">{error}{onRetry ? <> <button type="button" onClick={onRetry}>Reconnect</button></> : null}</p> : null}
    {!ready && !error ? <p role="status">Loading {siteName} navigation…</p> : null}
    <button type="button" className="site-navigation-overview-entry" disabled={!ready || Boolean(error)} onClick={onOpen}>
      <AcmIcon name="navigation.compass" scale="Regular-M" size={24} />
      <span><strong>Navigation</strong><small>{siteName} menu</small></span>
      <StudioIcon name="chevron-right" size={18} />
    </button>
    <p>Menu links belong to {siteName}. Edit their appearance in the shared Header template.</p>
  </section>;
}
