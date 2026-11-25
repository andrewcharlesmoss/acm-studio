"use client";

import { useEffect, useState, type ReactNode } from "react";
import catalogue from "../package-dashboard-catalogue.json";
import { SelectControl } from "../controls/native-fields";
import { StudioAppHeader } from "../studio-app-header";
import { PackageVersionDialog, type PackageChoice } from "./package-version-dialog";
import "./packages.css";

type PackageState = "installed" | "locked" | "local" | "broken" | "unidentified" | "missing" | "unused" | "unavailable";
type ConsumerPackage = { id: string; state: PackageState; declared?: string; version?: string | null; locked?: string | null; comparison: number | null };
type Release = { id: string; version: string; source: "registry" | "verified"; checkedAt?: string; publishedVersions?: string[] };
type Snapshot = { available: true; projects: { id: string; packages: ConsumerPackage[] }[]; releases: Release[] };

const stateLabel: Record<PackageState, string> = {
  installed: "Installed",
  locked: "Locked · install missing",
  local: "Local source · release unverified",
  broken: "Broken local link",
  unidentified: "Unidentifiable source",
  missing: "Missing installation",
  unused: "Not used",
  unavailable: "Local data unavailable",
};
const packageURL = "https://github.com/andrewcharlesmoss/packages/pkgs/npm/";
const checkedDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function revealPackageAction(control: HTMLSelectElement) {
  if (!control.matches(":focus-visible")) return;
  const projectLabel = control.closest("tr")?.querySelector("th");
  const scrollRegion = control.closest(".package-dash-scroll");
  if (!projectLabel || !scrollRegion) return;
  // Native focus scrolling can leave a control underneath the pinned project column.
  const action = control.getBoundingClientRect();
  const label = projectLabel.getBoundingClientRect();
  const region = scrollRegion.getBoundingClientRect();
  const rtl = getComputedStyle(scrollRegion).direction === "rtl";
  const left = rtl ? region.left : label.right;
  const right = rtl ? label.left : region.right;
  const outlineRoom = 4;
  if (action.left < left + outlineRoom) scrollRegion.scrollBy({ left: action.left - left - outlineRoom });
  else if (action.right > right - outlineRoom) scrollRegion.scrollBy({ left: action.right - right + outlineRoom });
}

function ConsumerCell({ dependency, release, action, actionNote }: {
  dependency?: ConsumerPackage;
  release?: Release;
  action?: ReactNode;
  actionNote?: string;
}) {
  if (!dependency) return <td>Unknown</td>;

  const label = stateLabel[dependency.state];
  const compare = dependency.comparison;
  const versionInPicker = Boolean(action && dependency.version === dependency.declared);
  const versionLabel = dependency.state === "locked" ? "Locked version" : dependency.state === "local" ? "Local version" : "Installed version";
  return <td>
    {action ? <div className="package-dash-cell-action">{action}</div> : null}
    {dependency.version && !versionInPicker ? action
      ? <span className="package-dash-detail">{versionLabel} v{dependency.version}</span>
      : <strong>v{dependency.version}</strong>
      : null}
    {compare === -1 && release ? <span className="package-dash-detail">Latest{release.source === "verified" ? " verified" : ""} v{release.version}</span> : null}
    {compare === 1 ? <span className="package-dash-detail">Ahead of latest {release?.source === "verified" ? "verified release" : "release"}</span> : null}
    <span className={dependency.version || action ? "package-dash-detail" : undefined}>{label}</span>
    {dependency.declared && !action ? <span className="package-dash-detail">Declared {dependency.declared}</span> : null}
    {dependency.state === "unidentified" && dependency.locked ? <span className="package-dash-detail">
      {action && dependency.locked === dependency.declared ? "Locked to selected version" : `Locked v${dependency.locked}`}
    </span> : null}
    {actionNote ? <span className="package-dash-detail">{actionNote}</span> : null}
  </td>;
}

export function PackageDashboard() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [phase, setPhase] = useState<"loading" | "complete" | "unavailable">("loading");
  const [request, setRequest] = useState(0);
  const [versionDialog, setVersionDialog] = useState<{ selected: PackageChoice; opener: HTMLSelectElement } | null>(null);
  const [savedChange, setSavedChange] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        if (window.location.hostname !== "localhost") throw new Error("Local Studio required");
        const response = await fetch("/__studio/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Studio-Client": "package-dashboard" },
          body: "{}",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Package data unavailable");
        const data = await response.json() as Snapshot;
        if (data.available !== true || !Array.isArray(data.projects) || !Array.isArray(data.releases)) throw new Error("Invalid package data");
        if (controller.signal.aborted) return;
        setSnapshot(data);
        setPhase("complete");
      } catch {
        if (controller.signal.aborted) return;
        setSnapshot(null);
        setPhase("unavailable");
      }
    }
    void load();
    return () => controller.abort();
  }, [request]);

  const loading = phase === "loading";
  const studioPackages = snapshot?.projects.find(project => project.id === "acm-studio")?.packages ?? [];
  const studioVersions = new Map(studioPackages.flatMap(dependency => {
    const { id, declared } = dependency;
    if (!declared || !/^\d+\.\d+\.\d+(?:[-+][\w.+-]+)?$/.test(declared)) return [];
    const published = snapshot?.releases.find(release => release.id === id)?.publishedVersions;
    const alternatives = published?.filter(version => version !== declared) ?? [];
    return [[id, { declared, published, alternatives }] as const];
  }));
  const canChooseVersion = Array.from(studioVersions.values()).some(({ alternatives }) => alternatives.length > 0);
  const registryUnavailable = snapshot?.releases.some(release => release.source === "verified");
  const status = loading ? "Checking package versions…" : phase === "unavailable"
    ? "Local package data unavailable. Open this page in local Studio to check installed versions."
    : registryUnavailable ? "Live registry unavailable for some or all packages. Comparisons use the verified versions and dates shown."
    : "Latest releases checked against GitHub Packages.";

  return <div className="studio-shell dashboard-shell">
    <StudioAppHeader section="Packages">
      <a className="studio-app-back" href="/">Back to Control Centre</a>
    </StudioAppHeader>
    <main className="dashboard-main package-dash">
      <div className="package-dash-heading">
        <h1>Packages</h1>
        <button className="button-secondary" type="button" disabled={loading} onClick={() => {
          setPhase("loading");
          setRequest(value => value + 1);
        }}>Refresh</button>
      </div>
      <p role="status" className="package-dash-status">{status}</p>
      {savedChange ? <p role="status">{savedChange}</p> : null}
      {canChooseVersion ? <p id="package-version-review-help" className="package-dash-note">Choosing a different version opens a review.</p> : null}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users need to scroll the table at narrow widths. */}
      <div className="package-dash-scroll" role="region" aria-label="Package versions by project" tabIndex={0}>
        <table className="package-dash-table" aria-busy={loading}>
          <caption className="visually-hidden">Shared ACM package versions by local project</caption>
          <thead><tr>
            <th scope="col">Project</th>
            {catalogue.packages.map(pkg => {
              const release = snapshot?.releases.find(item => item.id === pkg.id);
              return <th scope="col" key={pkg.id}>
                <a href={packageURL + pkg.id}>{pkg.label}</a>
                <span className="package-dash-detail">Latest release {release ? `v${release.version}` : "unavailable"}</span>
                {release?.checkedAt ? <span className="package-dash-detail">Verified {checkedDate.format(new Date(release.checkedAt))}</span> : null}
              </th>;
            })}
          </tr></thead>
          <tbody>{catalogue.projects.map(project => {
            const dependencies = snapshot?.projects.find(item => item.id === project.id)?.packages;
            return <tr key={project.id}>
              <th scope="row">{project.label}</th>
              {catalogue.packages.map(pkg => {
                const dependency = dependencies?.find(item => item.id === pkg.id);
                const release = snapshot?.releases.find(item => item.id === pkg.id);
                const versions = project.id === "acm-studio" ? studioVersions.get(pkg.id) : undefined;
                return <ConsumerCell key={pkg.id}
                  release={release}
                  dependency={dependency}
                  actionNote={versions && !versions.alternatives.length
                    ? versions.published ? "No other releases" : "Live versions unavailable" : undefined}
                  action={versions ?
                    <SelectControl aria-label={`${pkg.label} version`} aria-describedby={versions.alternatives.length ? "package-version-review-help" : undefined}
                      value={versions.declared} disabled={!versions.alternatives.length}
                      onFocus={event => revealPackageAction(event.currentTarget)} onChange={event => {
                        const opener = event.currentTarget;
                        const version = opener.value;
                        if (versions.alternatives.includes(version)) setVersionDialog({ selected: { id: pkg.id, label: pkg.label, version }, opener });
                      }}>
                      <option value={versions.declared}>v{versions.declared} (current)</option>
                      {versions.alternatives.map(version => <option key={version} value={version}>v{version}</option>)}
                    </SelectControl>
                    : null} />;
              })}
            </tr>;
          })}</tbody>
        </table>
      </div>
      <p className="package-dash-note">Hosted versions <strong>Unknown</strong>. Project Ports shows the local Icons build dependency.</p>
      {versionDialog ? <PackageVersionDialog selected={versionDialog.selected} opener={versionDialog.opener} onClose={() => setVersionDialog(null)}
        onApplied={message => {
          setVersionDialog(null);
          setSavedChange(message);
          setRequest(value => value + 1);
        }} /> : null}
    </main>
  </div>;
}
