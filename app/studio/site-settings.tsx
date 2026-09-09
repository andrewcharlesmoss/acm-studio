"use client";

import { useEffect, useRef, useState } from "react";
import type { MiniGolfSite } from "./site-registry";
import { StudioIcon } from "./studio-icons";

type Settings = {
  projectId: string; title: string; slug?: string; url: string; status: string; capturedAt: string;
  sharing: string; accessMode?: string; writable?: boolean; availableAccessModes?: string[];
  domains: { id: string; hostname: string; status: string; cname?: string; addresses?: string[]; records?: { type: string; name: string; value: string }[] }[];
  variables: { key: string; secret: boolean }[]; environmentRevision: number | null;
};
type Change = { kind: string; value?: string; key?: string; secret?: boolean; id?: string };
type Review = { confirmation: string; title: string; summary: string };

export function SiteSettings({ site }: { site: MiniGolfSite }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [revision, setRevision] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [change, setChange] = useState<Change | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [visible, setVisible] = useState(false);
  const session = useRef("");
  const dialog = useRef<HTMLDialogElement>(null);

  async function request(input: object, signal?: AbortSignal) {
    const response = await fetch("/__studio/site-settings", { method: "POST", headers: { "Content-Type": "application/json", "X-Studio-Client": "codex-history", "X-Studio-Settings-Token": session.current }, body: JSON.stringify(input), cache: "no-store", signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Sites is unavailable.");
    return data;
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/__studio/site-settings", { method: "POST", headers: { "Content-Type": "application/json", "X-Studio-Client": "codex-history" }, cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Connect to Sites to load current settings."); return response.json(); })
      .then((result) => { if (!session.current) setSettings(result.sites?.find((item: Settings) => item.projectId === site.hostingProjectId) ?? null); })
      .catch(() => { if (!controller.signal.aborted) setMessage("Connect to Sites to load current settings."); });
    return () => {
      controller.abort();
      if (session.current) void fetch("/__studio/site-settings", { method: "POST", headers: { "Content-Type": "application/json", "X-Studio-Client": "codex-history", "X-Studio-Settings-Token": session.current }, body: JSON.stringify({ action: "cancel" }), keepalive: true }).catch(() => {});
    };
  }, [site.hostingProjectId]);

  useEffect(() => {
    if (change) dialog.current?.showModal();
    else dialog.current?.close();
  }, [change]);

  async function refresh() {
    setBusy(true); setError(""); setMessage("");
    try {
      if (!session.current) session.current = (await request({ action: "connect" })).session;
      const data = await request({ action: "read", projectId: site.hostingProjectId });
      setSettings(data.settings); setRevision(data.revision); setConnected(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Sites is unavailable."); setConnected(false); session.current = ""; }
    finally { setBusy(false); }
  }
  function edit(next: Change) { setError(""); setReview(null); setConfirmed(false); setVisible(false); setChange(next); }
  function cancel() {
    if (busy) return;
    setChange(null); setReview(null); setVisible(false); setConfirmed(false);
    void request({ action: "cancel" }).catch(() => {});
  }
  async function prepare() {
    setBusy(true); setError("");
    try {
      const result = await request({ action: "prepare", projectId: site.hostingProjectId, revision, change });
      if (change?.kind === "variable") setChange({ ...change, value: "" });
      setReview(result); setVisible(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Review failed."); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError("");
    try {
      const data = await request({ action: "confirm", confirmation: review?.confirmation, confirmed });
      setSettings(data.settings); setRevision(data.revision); setMessage(data.message); setChange(null); setReview(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Save failed. Refresh before retrying."); setReview(null); setChange(null); setConnected(false); }
    finally { setBusy(false); }
  }
  const writable = connected && settings?.writable && !busy;
  const variable = change?.kind === "variable";
  return <section className="site-settings" aria-label="Site settings">
    <header><p className="site-settings-eyebrow">Site Settings</p><h1>{settings?.title ?? site.name}</h1><a href={settings?.url ?? site.publicHref} target="_blank" rel="noopener noreferrer">{new URL(settings?.url ?? site.publicHref).hostname}</a></header>
    <div className="site-settings-connect"><p>{connected ? "Connected to Sites. Reviewed changes affect this hosted project, not your local page draft." : "Connect to Sites to edit. Any details below are a dated snapshot."}</p><button disabled={busy} onClick={() => void refresh()}>{busy ? "Connecting…" : connected ? "Refresh" : "Connect to Sites"}</button></div>
    {error && !change ? <p role="alert">{error}</p> : null}{message ? <p role="status">{message}</p> : null}
    {settings ? <>
      <p className="site-settings-captured">{connected ? "Last checked" : "Snapshot checked"} <time dateTime={settings.capturedAt}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(settings.capturedAt))}</time> (Europe/London).</p>
      <section aria-labelledby="site-general-heading"><h2 id="site-general-heading">General</h2><dl className="site-settings-card">
        <div><dt>Name</dt><dd>{settings.title} <button disabled={!writable} onClick={() => edit({ kind: "name", value: settings.title })}>Edit Name</button></dd></div>
        <div><dt>URL</dt><dd><a href={settings.url} target="_blank" rel="noopener noreferrer">{settings.url}</a> <button disabled={!writable} onClick={() => edit({ kind: "slug", value: settings.slug })}>Change URL</button></dd></div>
        <div><dt>Sharing</dt><dd>{settings.sharing} <button disabled={!writable || settings.accessMode === "restricted"} onClick={() => edit({ kind: "sharing", value: settings.accessMode })}>Change Sharing</button>{settings.accessMode === "restricted" ? <p>Manage detailed access lists in Sites.</p> : null}</dd></div>
        <div><dt>Site status</dt><dd>{settings.status}</dd></div>
      </dl></section>
      <section aria-labelledby="site-domains-heading"><h2 id="site-domains-heading">Custom domains</h2>
        {settings.domains.length ? settings.domains.map((domain) => <div className="site-settings-card site-settings-domain" key={domain.hostname}><strong>{domain.hostname}</strong><p>{domain.status}</p><button disabled={!writable} onClick={() => edit({ kind: "remove-domain", id: domain.id })}>Remove Domain</button>{domain.status !== "active" ? <details><summary>DNS configuration</summary>{domain.cname ? <p>CNAME → {domain.cname}</p> : null}{domain.addresses?.map((address) => <p key={address}>A → {address}</p>)}{domain.records?.map((record, index) => <p key={index}>{record.type} · {record.name} → {record.value}</p>)}<p>Add these records at your DNS provider, then use Refresh to check the status.</p></details> : null}</div>) : <p>No custom domains configured.</p>}
        <button disabled={!writable} onClick={() => edit({ kind: "add-domain", value: "" })}>Add Custom Domain</button>
      </section>
      <section aria-labelledby="site-environment-heading"><h2 id="site-environment-heading">Environment variables</h2><p>Existing values stay hidden. Replacements are held temporarily for confirmation, never in browser storage. Variable changes require a separate deployment.</p>
        {settings.variables.length ? <div className="site-settings-card site-settings-variables"><table><caption>Hosted configuration — revision {settings.environmentRevision ?? "unknown"}</caption><thead><tr><th scope="col">Key</th><th scope="col">Secret</th><th scope="col">Actions</th></tr></thead><tbody>{settings.variables.map((item) => <tr key={item.key}><th scope="row"><code>{item.key}</code></th><td>{item.secret ? "Yes" : "No"}</td><td><button disabled={!writable} onClick={() => edit({ kind: "variable", key: item.key, value: "", secret: item.secret })}>Replace<span className="sr-only"> {item.key}</span></button><button disabled={!writable} onClick={() => edit({ kind: "remove-variable", key: item.key })}>Remove<span className="sr-only"> {item.key}</span></button></td></tr>)}</tbody></table></div> : <p>No environment variables configured.</p>}
        <button disabled={!writable} onClick={() => edit({ kind: "variable", key: "", value: "", secret: true })}>Add Variable</button>
      </section>
    </> : null}
    <section className="site-settings-native"><h2>More in Sites</h2><p>Analytics, database tools, detailed sharing and site deletion remain in Sites. Studio never deploys from this screen.</p><a href="https://chatgpt.com/sites" target="_blank" rel="noopener noreferrer">Open Sites</a></section>
    <dialog ref={dialog} className="site-settings-dialog" aria-labelledby="settings-dialog-title" onCancel={(event) => { event.preventDefault(); cancel(); }}>
      <h2 id="settings-dialog-title">{review ? "Review hosted change" : "Edit site setting"}</h2><p>{review?.title ?? settings?.title ?? site.name}</p>
      {error ? <p role="alert">{error}</p> : null}
      {review ? <><p>{review.summary}</p><p>No deployment will be started. Avoid changing the same setting elsewhere while saving.</p><label className="settings-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy} />I understand this changes the hosted site.</label><div className="settings-form-actions"><button disabled={busy} onClick={cancel}>Cancel</button><button disabled={busy || !confirmed} onClick={() => void save()}>{busy ? "Saving…" : "Save to Sites"}</button></div></> : change ? <form onSubmit={(event) => { event.preventDefault(); void prepare(); }}>
        {variable ? <label>Key<input required maxLength={128} pattern="[A-Za-z_][A-Za-z0-9_]*" value={change.key ?? ""} onChange={(event) => setChange({ ...change, key: event.target.value })} disabled={busy} /></label> : null}
        {change.kind === "sharing" ? <label>Who can view this site<select value={change.value} onChange={(event) => setChange({ ...change, value: event.target.value })} disabled={busy}><option value="private" disabled={!settings?.availableAccessModes?.includes("custom")}>Only Me</option><option value="public" disabled={!settings?.availableAccessModes?.includes("public")}>Anyone With the URL</option></select></label> : !change.kind.startsWith("remove-") ? <label>{variable ? "New value" : change.kind === "slug" ? "URL label" : change.kind === "add-domain" ? "Domain hostname" : "Name"}<span className="settings-value-field"><input required={!variable} type={variable && !visible ? "password" : "text"} autoComplete="off" maxLength={variable ? 16000 : change.kind === "name" ? 120 : 253} value={change.value ?? ""} onChange={(event) => setChange({ ...change, value: event.target.value })} disabled={busy} />{variable ? <button type="button" title={visible ? "Hide value" : "Show value"} aria-label={visible ? "Hide value" : "Show value"} aria-pressed={visible} onClick={() => setVisible(!visible)}><StudioIcon name="seen" /></button> : null}</span></label> : <p>Review the exact removal and its consequences before saving.</p>}
        {variable ? <label className="settings-check"><input type="checkbox" checked={change.secret} disabled={busy || settings?.variables.some((item) => item.key === change.key && item.secret)} onChange={(event) => setChange({ ...change, secret: event.target.checked })} />Store as a secret</label> : null}
        <div className="settings-form-actions"><button type="button" disabled={busy} onClick={cancel}>Cancel</button><button disabled={busy}>{busy ? "Checking…" : "Review Change"}</button></div>
      </form> : null}
    </dialog>
  </section>;
}
