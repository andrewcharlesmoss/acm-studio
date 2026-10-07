# Test local editing integration

## Scope and ownership

Test opens as a canvas context inside the existing `/studio` editor. Select Test
above Pages / Posts / Templates or open `/studio?site=test`. The existing tools,
document lists, tab counts and browser workspace remain in place. The former
`/studio/sites/test` route redirects into this shell. **Open Local Site** opens
the independent preview discovered through Project Ports.

Test owns `content/site.json`, envelope v2 (`acm-test-site`, site ID `test`),
containing a canonical Studio document with ordinary supported ContentBlock
records and metadata. Envelope v1 remains readable; the next accepted edit
writes v2. Header, main and footer start as semantic Group blocks and remain
ordinary editable blocks. The normal block library and inspector are reused.
New top-level insertions default to the main group when it exists.

Test is never inserted into browser Pages, Posts, Templates or publications.
Visual changes use the revision-checked disk gateway. Switching to a browser
document or template waits for a successful Test save; a failed save keeps the
Test draft visible. Files and Back to Content retain the selected canvas target.
Multiple ordinary Studio editor tabs can edit Test on the same browser origin.
The saving tab borrows the current Studio session's exclusive write ownership
and claims only the Test server lease. Other tabs submit validated changes to
that tab; they never write directly to the gateway. No second Web Lock is acquired.

The browser holds only a session and unsaved draft. `dist/index.html` is generated
with the shared Studio BlockRenderer, document context and existing block
styles, followed by Test's scoped appearance. Output records its source revision.
Direct image URLs are portable. Browser media IDs, background media IDs and blob
URLs cannot be saved to Test until a separately scoped media adapter exists;
rejected edits are reported visibly and preserve the current draft.

Prompts are deferred. There is no prompt panel in the current editor. The
previous confined proposal service remains dormant and does not expand visual
editing permissions. Local saves do not publish or deploy through Sites.

## Local configuration and commands

Project Ports owns the Test preview server and its lifecycle. Its current URL is
`http://localhost:3005/`; Studio discovers it through the existing local bridge.
The Studio gateway resolves `STUDIO_TEST_PATH` server-side; its default is the
canonical sibling `../test` project. `STUDIO_CODEX_BIN` may select the installed
Codex executable. These are optional private local settings, never browser input. Explicit Codex
configuration is preferred. If it is absent, the adapter searches the server
PATH, then documented Codex/ChatGPT macOS application bundle locations, accepting
only an existing executable file. An explicit invalid setting fails closed.

From the ACM Studio root:

- `npm run dev` starts the Studio integration through its development server.
- `node --test tests/test-site-store.test.mjs` checks gateway and confinement
  failures without touching the real Test project.
- `npm run typecheck`, `npm run lint` and `npm run build` check the application.
- `node scripts/render-test-site.mjs` is a one-time bootstrap for an approved
  initial `content/site.json`. It preserves the previous HTML in
  `.studio/original-index.html` and refuses an existing state file or writer lock.
  It is not the normal save command and must not overwrite an initialised site.

The gateway and prompt service are development-only. Building or committing
source does not push, save a Sites version or deploy the website. The existing
Sites project binding remains the separate publishing target.

## Saving, history and conflicts

A browser session uses an expiring random token, exact local origin checks and
Test-only operations. The Studio Web Lock permits one persistence coordinator;
the server's renewable owner lease and process guard coordinate file writes.
`.studio/writer.lock` contains a process identity; a second Studio process fails
closed while it exists. The service removes only its own lock on clean shutdown.

Each save includes the SHA-256 revision it was based on. The service validates the
whole document, generates output, rejects source or output beyond the shared
1 MiB readable-file limit, rechecks source/output freshness, then saves
through temporary files and atomic replacements. Requests are serialised.
`.studio/state.json` records output hashes and a pending transaction. After an
interruption, reconnecting regenerates output only when the source and output
match a known pending state. Unknown external file changes stop editing and are
preserved. Do not edit generated HTML directly.

Test uses a separate room in the existing typed tab-synchronisation system.
Session tokens are never broadcast. Edits to independent block properties merge
automatically; overlapping changes require **Use Other Change** or **Use My
Change**. Paragraph text is one property, so simultaneous edits to the same
paragraph require review rather than character-by-character merging. A choice
uses the latest saved state and retains unrelated changes from other tabs.

The saving tab continues serving Test while it switches to browser Pages, Posts
or Templates. Another ordinary editor tab can take over when that tab closes,
loading the current source and rebasing pending edits before saving. Tabs retain
their own navigation, selection and unsaved draft. The owner renews its lease in
the background; browser suspension can pause synchronisation safely. A paused
tab offers **Reconnect** and **Export Draft**. Unknown save failures are not
retried automatically.

This initial arrangement covers ordinary `/studio` editor tabs on the same
origin. It does not synchronise separate browsers, different ports or hosted
sites. If another full-page Studio route owns the global lock without a Test
broker, Test remains safely paused until an editor tab can own saving.

`.studio/history/` retains up to 100 source revisions. In-session visual changes
share Undo/Redo within each tab. Reloading, handover or receiving another tab's
saved changes clears obsolete in-session history, preventing old Undo snapshots
from overwriting newer work.

On a connection failure or conflict, the current draft remains in memory.
**Export Draft** downloads the draft, base revision and any preserved prompt
proposal. **Reconnect** reloads the saved source and asks before discarding a
changed draft. Do not rely on browser memory surviving a closed tab; export
unsaved content before leaving.

For a stale process guard after a crash, stop the owning Studio server and check
its recorded PID against the running process list. Remove only Test's
`.studio/writer.lock` after establishing that its owning process is gone, then
restart/reconnect. Never delete state, history or the source as a lock repair.
Review externally changed files against source history before resolving a hash
conflict; preserve copies and choose a reviewed source/output pair deliberately.

## Deferred prompt implementation

The prompt adapter uses a fresh empty temporary directory and an ephemeral
Codex app-server thread. It receives only the document snapshot and request.
It discovers inherited MCP names/transports, then starts a second process with
all those servers disabled and harmless dummy transports. Apps, plugins,
remote plugins, shell, unified execution, hooks, multi-agent, memories, JS REPL,
code mode and web search are disabled. Effective filesystem/network permissions (including inherited profile extras),
configuration and paginated MCP
tool surfaces are checked before any model turn; unexpected tools fail closed.

The verified local protocol uses a fresh named permission profile `studio_proposal_<random>`
(minimal filesystem read, network disabled), approval policy `never`, and a
structured `outputSchema`. Legacy `sandboxPolicy.readOnly.access` is rejected by
this installed runtime; do not substitute it without verifying the protocol.
The returned thread must resolve to read-only with network access disabled.
All server-initiated requests are rejected; unexpected completed tool items
reject the proposal. Processes and temporary directories are closed after each
request. A prompt never directly writes Test files or uses hosted connectors.

An accepted proposal must retain its base revision and pass the same document
validator as visual edits. The UI checks that its draft is unchanged before
accepting it, and the save gateway checks the revision again. Unsupported
requests leave the document unchanged and explain the limitation. Timeouts and
uncertain failures are not retried automatically.

## Verification boundary

Completion requires Test to open within the existing Studio shell while the left
pane retains its tools, tab labels, counts and browser document lists. Verify the
full block library and standard inspector, visual edits saved to the actual local
website, ordinary blocks such as List / Table / Separator, Edit / Preview
agreement, reload persistence, Undo / Redo and switching to browser documents
without contamination. Verify two editable tabs, independent-edit merging,
overlap choices against newer saved changes, latest-keystroke preservation,
owner handover, failed saves retaining drafts and the recovery boundary.
Use representative desktop and narrow views with
Studio's declared horizontal-scroll behaviour.

Prompt evidence from the earlier implementation is historical and deferred; it
does not establish acceptance of the current interface. Hosted publishing and independent hosted prompt editing remain outside this integration.
