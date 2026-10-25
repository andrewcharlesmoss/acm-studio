"use client";

import { StudioButton } from "./button";
import { AcmIcon } from "@acm/icons/react";
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
    <small className="dashboard-local-status" role="status" aria-label={accessibleStatus}>{dot}{address}</small>
    <StudioButton type="button" variant="text" className="dashboard-local-refresh" disabled={refreshing} aria-busy={refreshing || undefined} aria-label={refreshLabel} title={refreshLabel} onClick={onRefresh}>
      <AcmIcon name="action.refresh" size={16} />
    </StudioButton>
  </div>;
}
