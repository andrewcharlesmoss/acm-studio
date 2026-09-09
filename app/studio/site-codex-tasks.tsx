"use client";

import { useEffect, useRef, useState } from "react";
import { StudioIcon } from "./studio-icons";

type Task = { id: string; name: string; updatedAt: number };
type Turn = { id: string; items: { role: string; text: string }[] };
type History = { task: Task; turns: Turn[]; nextCursor: string | null };
type Item = { id: string; type: string; text: string; output?: string; status?: string };
type LiveTask = { id: string; name: string; status: string; error: string; items: Item[] };
type Approval = { id: string; threadId: string; method: string; command: string; reason: string; questions: { id: string; question: string; options?: { label: string }[] }[] };
type Runtime = { busy: boolean; active: string | null; tasks: LiveTask[]; approvals: Approval[] };

function MessageText({ text }: { text: string }) {
  const marker = text.indexOf("## My request:");
  const visible = marker >= 0 ? text.slice(marker + "## My request:".length).trim() : text;
  return <>{marker >= 0 ? <details className="codex-context"><summary>Attached context</summary><pre>{text.slice(0, marker)}</pre></details> : null}<div className="codex-message-text">{visible.split(/(```[\s\S]*?```)/g).map((part, index) => part.startsWith("```") ? <pre key={index}><code>{part.replace(/^```[^\n]*\n?/, "").replace(/```$/, "")}</code></pre> : <p key={index}>{part}</p>)}</div></>;
}

export function SiteCodexTasks() {
  const token = useRef("");
  const requestVersion = useRef(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [history, setHistory] = useState<History | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<Runtime>({ busy: false, active: null, tasks: [], approvals: [] });
  const [connected, setConnected] = useState(false);
  const [writeEnabled, setWriteEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [handover, setHandover] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const live = runtime.tasks.find((task) => task.id === selected);

  async function request(body: object) {
    const response = await fetch("/__studio/codex", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", "X-Studio-Client": "codex-history", "X-Studio-Token": token.current }, body: JSON.stringify(body) });
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("The local Codex connection is unavailable. Open Studio through its local development server.");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Local Codex is unavailable.");
    return data;
  }
  async function loadTasks(older = false) {
    setLoading(true); setError("");
    try {
      if (!token.current) { const connection = await request({ action: "connect" }); token.current = connection.token; setWriteEnabled(connection.writable); }
      const result = await request({ action: "list", archived, cursor: older ? cursor : null });
      setTasks((previous) => older ? [...previous, ...result.tasks] : result.tasks);
      setCursor(result.nextCursor); setLoaded(true); setConnected(true);
      setRuntime(await request({ action: "state" }));
    } catch (reason) { token.current = ""; setConnected(false); setError(reason instanceof Error ? reason.message : "Local Codex is unavailable."); }
    finally { setLoading(false); }
  }
  async function openTask(threadId: string, older = false) {
    const version = ++requestVersion.current;
    setSelected(threadId); setError("");
    if (!older) setHistory(null);
    if (runtime.tasks.some((task) => task.id === threadId)) return;
    setLoading(true);
    try {
      const result: History = await request({ action: "read", threadId, cursor: older ? history?.nextCursor : null });
      if (version === requestVersion.current) setHistory((previous) => older && previous ? { ...result, turns: [...result.turns, ...previous.turns] } : result);
    } catch (reason) { if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "This task could not be read."); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }
  async function act(body: object) {
    setLoading(true); setError("");
    try { const result = await request(body); setRuntime(await request({ action: "state" })); return result; }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The request failed."); return null; }
    finally { setLoading(false); }
  }
  async function send() {
    if (loading || !writeEnabled || runtime.busy || history || !handover || !prompt.trim()) return;
    const result = await act({ action: "submit", threadId: live?.id, prompt, handover });
    if (result) { setSelected(result.threadId); setPrompt(""); setHistory(null); }
  }
  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try { const state = await request({ action: "state" }); if (!cancelled) setRuntime(state); }
      catch { if (!cancelled) { setConnected(false); setError("Codex disconnected. Reconnect before sending another request."); } }
      if (!cancelled) timer = setTimeout(poll, 1000);
    }
    timer = setTimeout(poll, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [connected]);
  useEffect(() => () => { requestVersion.current += 1; }, []);

  const title = live?.name ?? history?.task.name ?? "New task";
  return <section className="site-codex" aria-label="Mini Golf Codex workspace">
    <aside className="codex-sidebar">
      <div className="codex-sidebar-heading"><strong>Codex</strong><span>Local</span></div>
      <button className="codex-new" disabled={loading} onClick={() => { requestVersion.current++; setSelected(null); setHistory(null); setPrompt(""); setError(""); }}><StudioIcon name="pencil" size={18} />New Task</button>
      <button onClick={() => void loadTasks()} disabled={loading}>{connected ? "Refresh Tasks" : "Connect Codex"}</button>
      <label className="codex-archive"><input type="checkbox" checked={archived} disabled={loading} onChange={(event) => { setArchived(event.target.checked); setTasks([]); setCursor(null); setLoaded(false); }} />Archived Tasks</label>
      <h2>mini-golf-scorecard</h2>
      <nav aria-label="Mini Golf tasks">
        {runtime.tasks.map((task) => <button className="codex-task" key={task.id} aria-current={selected === task.id ? "page" : undefined} onClick={() => void openTask(task.id)}><span>{task.name}</span><small>{task.status}</small></button>)}
        {tasks.filter((task) => !runtime.tasks.some((liveTask) => liveTask.id === task.id)).map((task) => <button className="codex-task" key={task.id} aria-current={selected === task.id ? "page" : undefined} disabled={loading} onClick={() => void openTask(task.id)}><span>{task.name}</span></button>)}
      </nav>
      {loaded && !loading && !tasks.length ? <p>No tasks found for this project folder.</p> : null}
      {cursor ? <button disabled={loading} onClick={() => void loadTasks(true)}>More Tasks</button> : null}
      <p className="codex-local-note">Actual local project<br />Deployment is manual</p>
    </aside>
    <div className="codex-main">
      <header className="codex-task-header"><strong>{title}</strong><span role="status">{live?.status ?? (history ? "Saved conversation" : connected ? "Ready" : "Not connected")}</span></header>
      <div className="codex-timeline">
        {error ? <p className="codex-error" role="alert">{error}</p> : null}
        {loading ? <p role="status">Working…</p> : null}
        {!selected ? <div className="codex-welcome"><h1>What shall we build?</h1><p>Work on the real Mini Golf Scorecard project.</p></div> : null}
        {history ? <>{history.nextCursor ? <button disabled={loading} onClick={() => void openTask(history.task.id, true)}>Earlier Messages</button> : null}{history.turns.map((turn) => <section key={turn.id} aria-label="Task turn">{turn.items.map((item, index) => <article className={`codex-message is-${item.role}`} key={index}><MessageText text={item.text} /></article>)}</section>)}<p className="codex-history-note">Saved desktop conversation. Start a new task to code from Studio; this view does not take over desktop tasks. Attachments are not shown.</p></> : null}
        {live?.items.map((item) => item.type === "assistant" || item.type === "user" ? <article key={item.id} className={`codex-message is-${item.type}`}><MessageText text={item.text} /></article> : <details className="codex-activity" key={item.id}><summary>{item.type === "changes" ? "Files changed" : "Ran command"} · {item.status}</summary><pre>{item.text}</pre>{item.output ? <pre>{item.output}</pre> : null}</details>)}
        {live?.error ? <p className="codex-error">{live.error}</p> : null}
        {runtime.approvals.filter((approval) => approval.threadId === selected).map((approval) => <section className="codex-approval" key={approval.id}><h2>{approval.questions.length ? "Question" : "Approval required"}</h2><p>{approval.reason}</p>{approval.command ? <pre>{approval.command}</pre> : null}{approval.questions.length ? <>{approval.questions.map((question) => <label key={question.id}>{question.question}{question.options?.length ? <span>{question.options.map((option) => option.label).join(" · ")}</span> : null}<input value={answers[question.id] ?? ""} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })} /></label>)}<button disabled={loading} onClick={() => void act({ action: "answer", approvalId: approval.id, answers })}>Send Answer</button></> : <div><button disabled={loading} onClick={() => void act({ action: "answer", approvalId: approval.id, decision: "decline" })}>Decline</button><button disabled={loading} onClick={() => void act({ action: "answer", approvalId: approval.id, decision: "accept" })}>Allow Once</button></div>}</section>)}
      </div>
      <div className="codex-composer-area">
        {!history ? <label className="codex-handover"><input type="checkbox" checked={handover} disabled={runtime.busy} onChange={(event) => setHandover(event.target.checked)} />Use Studio for Mini Golf coding. Desktop coding for this project is idle and will stay idle while Studio works.</label> : null}
        <form className="codex-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <textarea aria-label="Message Codex" placeholder={history ? "Start a new task to code from Studio" : "Ask Codex to build something…"} value={prompt} maxLength={20000} disabled={!connected || Boolean(history)} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} />
          <div className="codex-composer-toolbar"><span>{writeEnabled ? "Codex default model · Local project" : "Coding is not enabled on this server"}</span>{runtime.busy ? <button type="button" aria-label="Stop Codex" disabled={loading || !runtime.active} onClick={() => void act({ action: "stop", threadId: runtime.active })}><StudioIcon name="close" size={18} />Stop</button> : <button type="submit" aria-label="Send to Codex" disabled={loading || !connected || !writeEnabled || !handover || Boolean(history) || !prompt.trim()}><StudioIcon name="arrow-right" size={18} /></button>}</div>
        </form>
        <p className="codex-safety-note">Studio runs one task at a time. The handover is not a cross-app lock. Page previews and file snapshots do not refresh automatically after code changes.</p>
      </div>
    </div>
  </section>;
}
