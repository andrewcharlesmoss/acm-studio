"use client";

import { useEffect, useId, useRef, type Dispatch, type SetStateAction, type KeyboardEvent, type MouseEvent } from "react";
import { AcmIcon } from "@acm/icons/react";
import { Ribbon, RibbonPanel, RibbonGroup, RibbonControls, RibbonButton, RibbonToggleButton, RibbonField } from "@acm/ribbon";
import type { ControlDefinition, ExampleDefinition } from "./catalogue-model";
import { controlPresentation, disabledReason, fixtureColumns, hasAccountSelection, initialDemo, rangeValue, runDemoCommand, setAccountColumns, setDemoSelection, visibleRows, type DemoState } from "./demo-state";

type StateSetter = Dispatch<SetStateAction<DemoState>>;
type ControlProps = { control: ControlDefinition; state: DemoState; setState: StateSetter; rememberTrigger?: (element: HTMLButtonElement) => void };
function Control({ control, state, setState, rememberTrigger }: ControlProps) {
  const inputId = useId();
  const presentation = controlPresentation(control, state);
  const reason = disabledReason(control, state);
  const run = (value?: string | number | boolean) => setState((current) => runDemoCommand(current, control, value));
  const icon = presentation.icon ? <AcmIcon name={presentation.icon} scale={control.size === "compact" ? "Regular-S" : "Regular-M"} size={control.size === "compact" ? 16 : control.size === "large" ? 24 : 22} /> : null;
  if (control.condition && !state[control.condition]) return null;
  if (control.kind === "compound-range") return <div className="rl-compound" data-region={control.id}>
    <div className="rl-range-heading"><label htmlFor={inputId}>{control.label}</label><output htmlFor={inputId}>{rangeValue(control, state)} px</output></div>
    <div className="rl-range-actions">{control.children?.map((child) => <Control key={child.id} control={child} state={state} setState={setState} />)}</div>
    <input id={inputId} aria-label={control.label} type="range" min={control.min} max={control.max} step={control.step} value={rangeValue(control, state)} disabled={Boolean(reason)} title={reason} onChange={(event) => run(Number(event.target.value))} />
  </div>;
  if (control.kind === "split") return <div className="rl-split" data-region={control.id}>
    <RibbonToggleButton pressed={presentation.pressed} onClick={() => run()}>{icon}<span>{presentation.label}</span></RibbonToggleButton>
    <RibbonButton data-region="account.highlight.menu" size="compact" aria-label="Choose Highlight Mode" aria-haspopup="menu" aria-expanded={state.menu === "highlight"} onClick={(event: MouseEvent<HTMLButtonElement>) => { rememberTrigger?.(event.currentTarget); setState((current) => ({ ...current, menu: current.menu === "highlight" ? null : "highlight" })); }}><AcmIcon name="navigation.disclosure" size={16} scale="Regular-S" /></RibbonButton>
  </div>;
  if (["text", "number", "select", "range"].includes(control.kind)) {
    const value = state.values[control.id] as string | number;
    return <RibbonField data-region={control.id} className="rl-field">
      <span>{control.label}</span>
      {control.kind === "select" ? <select aria-label={control.label} value={value} disabled={Boolean(reason)} onChange={(event) => run(event.target.value)}>{control.options?.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select> :
        <input aria-label={control.label} type={control.kind} value={value} min={control.min} max={control.max} step={control.step} maxLength={control.kind === "text" ? control.max ?? 100 : undefined} disabled={Boolean(reason)} onChange={(event) => run(control.kind === "number" || control.kind === "range" ? Number(event.target.value) : event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && control.id === "account.search-input") { event.preventDefault(); setState((current) => runDemoCommand(current, { ...control, id: "account.search", command: "account.search", kind: "button", label: "Search" })); } }} />}
      {control.kind === "range" ? <output>{value}</output> : null}
    </RibbonField>;
  }
  const content = <>{icon}{!control.iconOnly && <span>{presentation.label}</span>}</>;
  const common = {
    "data-region": control.id, size: control.size, disabled: Boolean(reason),
    "aria-label": control.id.endsWith(".scope") ? presentation.label + " " + control.label : presentation.label,
    title: reason ?? control.label,
    onClick: (event: MouseEvent<HTMLButtonElement>) => { if (control.id === "account.columns") rememberTrigger?.(event.currentTarget); run(); },
  };
  return control.kind === "toggle" ? <RibbonToggleButton {...common} pressed={presentation.pressed}>{content}</RibbonToggleButton> :
    <RibbonButton {...common} active={presentation.pressed} aria-haspopup={control.id === "account.columns" ? "dialog" : undefined} aria-expanded={control.id === "account.columns" ? state.menu === "columns" : undefined}>{content}</RibbonButton>;
}

function Fixture({ example, state, setState }: { example: ExampleDefinition; state: DemoState; setState: StateSetter }) {
  const editField = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state.editing) editField.current?.focus(); }, [state.editing]);
  const rows = visibleRows(state);
  if (example.id === "skeleton") return <div className="rl-specimen-note"><AcmIcon name="tool.select" size={32} /><h3>A working component specimen</h3><p>Try the tabs, toggle and fields. Use Tab for keyboard focus, or choose an item in Structure to inspect its boundary.</p><p>Range inputs are native controls wrapped by RibbonField.</p></div>;
  if (example.id === "studio") return <div className="rl-canvas-fixture">
    {state.values["studio.pages.toggle"] && <aside aria-label="Demo Pages"><span>Pages</span><button type="button" aria-pressed={state.selected} onClick={() => setState((current) => ({ ...current, selected: !current.selected }))}>01 — Summer Notes</button>{state.values["studio.all-pages"] && <button type="button">02 — Details</button>}</aside>}
    <div className="rl-canvas-scroll"><div className="rl-demo-canvas" style={{ transform: "scale(" + Number(state.values["studio.zoom"] ?? 100) / 100 + ")" }}>
      <span className="rl-canvas-caption">A small canvas for trying commands</span>
      {state.objects.map((object, index) => <button key={object.id} type="button" aria-label={"Select " + object.label} aria-pressed={state.selected && object.id === state.selectedObjectId} onClick={() => setState((current) => ({ ...current, selected: true, selectedObjectId: object.id }))} className={"rl-object rl-object-" + object.kind + (state.selected && object.id === state.selectedObjectId ? " rl-object-selected" : "") + (state.values["studio.border"] ? " rl-purple" : "")} style={{ left: 35 + (object.id - 1) * 42, top: 65 + (object.id - 1) * 35, zIndex: index }}>
        {object.kind === "text" ? object.label : object.kind === "image" ? <AcmIcon name="insert.image" size={52} /> : null}
      </button>)}
    </div></div>
    <p className="rl-fixture-caption">Tool: {String(state.values["studio.tool"] ?? "select")} · Shape: {String(state.values["studio.shapes"])} · Zoom: {String(state.values["studio.zoom"])}% · {state.locked ? "Locked" : "Unlocked"}</p>
  </div>;
  return <div className="rl-table-fixture">
    <div className="rl-table-scroll"><table aria-label="Fictitious Account Directory">
      <thead><tr>{state.columns.map((column) => <th key={column} style={{ minWidth: state.columnWidths[column] ?? state.allColumnWidth }}>{column[0].toUpperCase() + column.slice(1)}</th>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id} style={{ height: state.rowHeights[row.id] ?? state.allRowHeight }}>{state.columns.map((column) => {
        const selected = hasAccountSelection(state) && state.selectedRow === row.id && state.selectedColumn === column;
        const highlighted = hasAccountSelection(state) && ((state.highlight === "row" || state.highlight === "both") && state.selectedRow === row.id || (state.highlight === "column" || state.highlight === "both") && state.selectedColumn === column);
        return <td key={column} className={(highlighted ? "rl-highlighted " : "") + (selected ? "rl-cell-selected" : "")}>
          {selected && state.editing ? <input ref={editField} aria-label={"Edit " + column} value={row[column as keyof typeof row]} onChange={(event) => setState((current) => ({ ...current, rows: current.rows.map((item) => item.id === row.id ? { ...item, [column]: event.target.value } : item) }))} onBlur={() => setState((current) => ({ ...current, editing: false }))} onKeyDown={(event) => { if (event.key === "Enter" || event.key === "Escape") setState((current) => ({ ...current, editing: false })); }} /> :
            <button type="button" aria-label={row.name + ", " + column + ": " + row[column as keyof typeof row]} aria-pressed={selected} disabled={!state.values["account.cell"]} onClick={() => setState((current) => ({ ...current, selected: true, selectedRow: row.id, selectedColumn: column, editing: false }))}>{row[column as keyof typeof row]}</button>}
        </td>;
      })}</tr>)}</tbody>
    </table></div>
    {state.loading ? <p role="status">Refreshing accounts… (loading scenario)</p> : !rows.length ? <p role="status">No matching fictitious accounts.</p> : <p>{rows.length} fictitious results{state.query || state.filter ? " · filters active" : ""}</p>}
    {state.values["account.record"] && <section className="rl-record" aria-label="Demo Account Record"><h3>Account record</h3><p>{state.rows.find((row) => row.id === state.selectedRow)?.name ?? "Select a row to inspect its record."}</p><p>Details remain inside this demonstration.</p></section>}
  </div>;
}

export function RibbonPreview({ example, tab, setTab, state, setState }: { example: ExampleDefinition; tab: string; setTab: (tab: string) => void; state: DemoState; setState: StateSetter }) {
  const trigger = useRef<HTMLButtonElement | null>(null);
  const popup = useRef<HTMLDivElement | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  const closeMenu = () => {
    const target = root.current?.querySelector<HTMLButtonElement>(state.menu === "columns" ? '[data-region="account.columns"]' : '[data-region="account.highlight.menu"]') ?? trigger.current;
    setState((current) => ({ ...current, menu: null }));
    target?.focus();
  };
  useEffect(() => {
    if (state.menu) popup.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [state.menu]);
  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && state.menu) { event.preventDefault(); event.stopPropagation(); closeMenu(); return; }
    if (state.menu || example.id !== "studio" || !(event.metaKey || event.ctrlKey)) return;
    if (event.target instanceof HTMLElement && event.target.closest("input,select,textarea,[contenteditable=true]")) return;
    const controls = example.tabs.flatMap((item) => item.groups.flatMap((group) => group.controls));
    const command = event.key.toLowerCase() === "z" ? event.shiftKey ? "studio.redo" : "studio.undo" : event.key.toLowerCase() === "y" && event.ctrlKey ? "studio.redo" : ["+", "="].includes(event.key) || event.code === "NumpadAdd" ? "studio.zoom-in" : event.key === "-" || event.code === "NumpadSubtract" ? "studio.zoom-out" : event.key === "0" ? "studio.fit" : null;
    const control = controls.find((item) => item.id === command);
    if (control) { event.preventDefault(); setState((current) => runDemoCommand(current, control)); }
  }
  const highlightDefinition = example.tabs.flatMap((item) => item.groups.flatMap((group) => group.controls)).find((control) => control.id === "account.highlight");
  return <div ref={root} className={"rl-preview rl-product-" + example.id} onKeyDownCapture={handleKeys}>
    <Ribbon data-region={example.id} tabs={example.tabs} activeTab={tab} onTabChange={(value: string) => { setTab(value); setState((current) => ({ ...current, menu: null })); }} accessibleName={example.label + " Demonstration"}
      brand={example.brand ? <span className="rl-brand-slot">{example.headerControls?.map((control) => <Control key={control.id} control={control} state={state} setState={setState} />) ?? "ACM Ribbon"}</span> : undefined}
      status={example.brand ? "Temporary demo" : undefined}>
      {example.tabs.map((panel) => <RibbonPanel key={panel.id} tab={panel.id} data-region={example.id + ".panel." + panel.id}>
        {panel.groups.map((group) => <RibbonGroup key={group.id} label={group.label} data-region={group.id}>
          <RibbonControls data-region={group.id + ".controls"}>{group.controls.map((control) => <Control key={control.id} control={control} state={state} setState={setState} rememberTrigger={(element) => { trigger.current = element; }} />)}</RibbonControls>
        </RibbonGroup>)}
      </RibbonPanel>)}
    </Ribbon>
    {state.menu ? <div ref={popup} className="rl-popup" role={state.menu === "highlight" ? "menu" : "dialog"} aria-label={state.menu === "highlight" ? "Highlight Mode" : "Visible Columns"} onKeyDown={(event) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End", "Tab"].includes(event.key)) return;
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button,input"));
      const index = items.indexOf(event.target as HTMLElement);
      if (event.key === "Tab") { event.preventDefault(); items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus(); }
      else { event.preventDefault(); items[event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus(); }
    }}>
      <div className="rl-popup-heading"><strong>{state.menu === "highlight" ? "Highlight Mode" : "Visible Columns"}</strong><button type="button" data-region={state.menu === "highlight" ? "account.highlight.close" : "account.columns.close"} aria-label={state.menu === "highlight" ? "Close Highlight Menu" : "Close Columns"} onClick={closeMenu}><AcmIcon name="action.close" size={20} /></button></div>
      {state.menu === "highlight" ? highlightDefinition?.children?.filter((control) => ["row", "column", "both"].some((mode) => control.id.endsWith("." + mode))).map((control) => <button key={control.id} data-region={control.id} type="button" role="menuitemradio" aria-checked={state.highlight === control.id.split(".").at(-1)} onClick={() => { setState((current) => runDemoCommand(current, control)); closeMenu(); }}><AcmIcon name={control.icon!} size={24} /><span>{control.label}</span>{state.highlight === control.id.split(".").at(-1) && <AcmIcon name="state.selected" size={16} />}</button>) :
        fixtureColumns.map((column) => <label key={column}><input type="checkbox" checked={state.columns.includes(column)} disabled={state.columns.length === 1 && state.columns.includes(column)} onChange={(event) => setState((current) => setAccountColumns(current, event.target.checked ? fixtureColumns.filter((name) => name === column || current.columns.includes(name)) : current.columns.filter((name) => name !== column)))} />{column[0].toUpperCase() + column.slice(1)}</label>)}
    </div> : null}
    <div className="rl-scenario-bar" aria-label="Demonstration Scenarios">
      {example.id !== "skeleton" && <>
        <label><input type="checkbox" checked={example.id === "account" ? hasAccountSelection(state) : state.selected} onChange={(event) => setState((current) => setDemoSelection(current, event.target.checked, example.id === "account"))} />Selection</label>
        <label><input type="checkbox" checked={state.locked} onChange={(event) => setState((current) => ({ ...current, locked: event.target.checked, editing: false }))} />Locked</label>
        {example.id === "studio" ? <><label><input type="checkbox" checked={state.handoff} onChange={(event) => setState((current) => ({ ...current, handoff: event.target.checked }))} />Media Handoff</label><label><input type="checkbox" checked={state.linked} onChange={(event) => setState((current) => ({ ...current, linked: event.target.checked }))} />Linked Media</label></> :
          <><label><input type="checkbox" checked={state.loading} onChange={(event) => setState((current) => ({ ...current, loading: event.target.checked }))} />Loading</label><label><input type="checkbox" checked={state.empty} onChange={(event) => setState((current) => ({ ...current, empty: event.target.checked, selected: false }))} />Empty Results</label></>}
      </>}
      <button type="button" onClick={() => { setState(initialDemo(example)); setTab(example.initialTab); }}><AcmIcon name="action.reset" size={18} />Reset Demo</button>
    </div>
    <Fixture example={example} state={state} setState={setState} />
    <p className="rl-demo-status" role="status">{state.message}</p>
  </div>;
}
