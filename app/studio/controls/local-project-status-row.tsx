"use client";

import { StudioButton } from "./button";
import "./local-project-status-row.css";

export function LocalProjectStatusRow({ address, statusLabel, serverState, refreshLabel, refreshing = false, onRefresh }: {
  address?: string;
  statusLabel: string;
  serverState: "running" | "failed" | "stale" | "unavailable";
  refreshLabel: string;
  refreshing?: boolean;
  onRefresh: () => void;
}) {
  const dot = <span className="studio-server-status-dot" data-state={serverState} aria-hidden="true" />;
  const accessibleStatus = address ? `${statusLabel} — ${address}` : statusLabel;

  return <div className="dashboard-local-status-row">
    <StudioButton type="button" variant="text" className="dashboard-local-status dashboard-local-status-trigger" disabled={refreshing} aria-busy={refreshing || undefined} aria-label={refreshLabel} aria-description={accessibleStatus} title={refreshLabel} onClick={onRefresh}>
      {dot}<span className="dashboard-local-status-address">{address ?? statusLabel}</span>
    </StudioButton>
    <span className="visually-hidden dashboard-local-status-announcement" role="status">{accessibleStatus}</span>
  </div>;
}
