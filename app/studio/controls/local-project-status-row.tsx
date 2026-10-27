"use client";

import { StudioButton } from "./button";
import "./local-project-status-row.css";

/** Shares adaptive address text between fixture statuses and Studio's self-status. */
export function LocalProjectStatusAddress({ address, fallback }: { address?: string; fallback?: string }) {
  const port = address?.match(/^localhost:(\d+)(?:\/.*)?$/i)?.[1];
  return <span className="dashboard-local-status-address">{port
    ? <><span className="dashboard-local-status-address-full">{address}</span><span className="dashboard-local-status-address-port" aria-hidden="true">{port}</span></>
    : address ?? fallback}</span>;
}

export function LocalProjectStatusRow({ address, statusLabel, serverState, refreshLabel, refreshing = false, announcement, onRefresh }: {
  address?: string;
  statusLabel: string;
  serverState: "running" | "failed" | "stale" | "unavailable";
  refreshLabel: string;
  refreshing?: boolean;
  announcement?: string;
  onRefresh: () => void;
}) {
  const dot = <span className="studio-server-status-dot" data-state={serverState} aria-hidden="true" />;
  const accessibleStatus = address ? `${statusLabel} — ${address}` : statusLabel;

  return <div className="dashboard-local-status-row">
    <StudioButton type="button" variant="text" className="dashboard-local-status dashboard-local-status-trigger" disabled={refreshing} aria-busy={refreshing || undefined} aria-label={refreshLabel} aria-description={accessibleStatus} title={refreshLabel} onClick={onRefresh}>
      {dot}<LocalProjectStatusAddress address={address} fallback={statusLabel} />
    </StudioButton>
    <span className="visually-hidden dashboard-local-status-announcement" role="status">{announcement ?? accessibleStatus}</span>
  </div>;
}
