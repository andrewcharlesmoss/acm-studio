"use client";

import { CheckboxControl } from "../controls/checkbox-control";
import { NumberInput, SelectControl, TextInput } from "../controls/native-fields";
import { StudioAnchoredMenu } from "../overlays/anchored-menu";
import { StudioAnchoredPopover } from "../overlays/anchored-popover";
import { RangeControl } from "../controls/range-control";
import { HistoryActionButton } from "../controls/history-actions";
import { isNativeEditingTarget, workspaceHistoryShortcut, workspaceZoomShortcut } from "../workspace-shortcuts.mjs";

import { useEffect, useId, useRef, type RefObject, type Dispatch, type SetStateAction, type KeyboardEvent, type MouseEvent } from "react";
import { AcmIcon } from "@acm/icons/react";
import { Ribbon, RibbonPanel, RibbonGroup, RibbonControls, RibbonButton, RibbonToggleButton, RibbonField } from "@acm/ribbon";
import type { ControlDefinition, ExampleDefinition } from "./catalogue-model";
import { controlPresentation, demoCanvasSize, disabledReason, fixtureColumns, hasAccountSelection, initialDemo, rangeValue, runDemoCommand, setAccountColumns, setDemoSelection, visibleRows, type DemoState } from "./demo-state";

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
    <RangeControl id={inputId} aria-label={control.label} min={control.min} max={control.max} step={control.step} value={rangeValue(control, state)} disabled={Boolean(reason)} title={reason} onChange={(event) => run(Number(event.target.value))} />
  </div>;
  if (control.kind === "split") return <div className="rl-split" data-region={control.id}>
    <RibbonToggleButton pressed={presentation.pressed} onClick={() => run()}>{icon}<span>{presentation.label}</span></RibbonToggleButton>
    <RibbonButton data-region="account.highlight.menu" size="compact" aria-label="Choose Highlight Mode" aria-haspopup="menu" aria-expanded={state.menu === "highlight"} onClick={(event: MouseEvent<HTMLButtonElement>) => { rememberTrigger?.(event.currentTarget); setState((current) => ({ ...current, menu: current.menu === "highlight" ? null : "highlight" })); }}><AcmIcon name="navigation.disclosure" size={16} scale="Regular-S" /></RibbonButton>
  </div>;
  if (["text", "number", "select", "range"].includes(control.kind)) {
    const value = state.values[control.id] as string | number;
    return <RibbonField data-region={control.id} className="rl-field">
      <span>{control.label}</span>
      {control.kind === "select" ? <SelectControl aria-label={control.label} value={value} disabled={Boolean(reason)} onChange={(event) => run(event.target.value)}>{control.options?.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</SelectControl> :
        control.kind === "range" ? <RangeControl aria-label={control.label} value={value} min={control.min} max={control.max} step={control.step} disabled={Boolean(reason)} onChange={event => run(Number(event.target.value))} /> :
        control.kind === "number" ? <NumberInput aria-label={control.label} value={value} min={control.min} max={control.max} step={control.step} disabled={Boolean(reason)} onChange={event => run(Number(event.target.value))} /> :
        <TextInput aria-label={control.label} value={value} maxLength={control.max ?? 100} disabled={Boolean(reason)} onChange={event => run(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && control.id === "account.search-input") { event.preventDefault(); setState((current) => runDemoCommand(current, { ...control, id: "account.search", command: "account.search", kind: "button", label: "Search" })); } }} />}
      {control.kind === "range" ? <output>{value}</output> : null}
    </RibbonField>;
  }
  if (control.id === "studio.undo" || control.id === "studio.redo") return <HistoryActionButton action={control.id === "studio.undo" ? "undo" : "redo"} presentation="ribbon" ribbonSize={control.size} data-region={control.id} disabled={Boolean(reason)} title={reason} aria-label={presentation.label} onClick={() => run()} />;
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
  const canvasScale = Number(state.values["studio.zoom"] ?? 100) / 100;
  if (example.id === "skeleton") return <div className="rl-specimen-note"><AcmIcon name="tool.select" size={32} /><h3>A working component specimen</h3><p>Try the tabs, toggle and fields. Use Tab for keyboard focus, or choose an item in Structure to inspect its boundary.</p><p>Range inputs are native controls wrapped by RibbonField.</p></div>;
  if (example.id === "studio") return <div className="rl-canvas-fixture">
    {state.values["studio.pages.toggle"] && <aside aria-label="Demo Pages"><span>Pages</span><button type="button" aria-pressed={state.selected} onClick={() => setState((current) => ({ ...current, selected: !current.selected }))}>01 — Summer Notes</button>{state.values["studio.all-pages"] && <button type="button">02 — Details</button>}</aside>}
    {/* Keyboard users need to focus this region to scroll the zoomed page. */}
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
    <div className="rl-canvas-scroll" role="region" aria-label="Demo canvas" tabIndex={0}>
      <p className="rl-canvas-help">Select an object, then try Duplicate, Arrange or Zoom in the ribbon. This sample is not a drawing editor.</p>
      <div className="rl-canvas-size" style={{ width: demoCanvasSize.width * canvasScale, height: demoCanvasSize.height * canvasScale }}><div className="rl-demo-canvas" style={{ width: demoCanvasSize.width, height: demoCanvasSize.height, transform: "scale(" + canvasScale + ")" }}>
      {state.objects.map((object, index) => <button key={object.id} type="button" aria-label={"Select " + object.label} title={object.label} aria-pressed={state.selected && object.id === state.selectedObjectId} onClick={() => setState((current) => ({ ...current, selected: true, selectedObjectId: object.id }))} className={"rl-object rl-object-" + object.kind + (state.selected && object.id === state.selectedObjectId ? " rl-object-selected" : "") + (state.values["studio.border"] ? " rl-purple" : "")} style={{ left: object.x, top: object.y, width: object.width, height: object.height, zIndex: index }}>
        {object.kind === "text" ? object.label : object.kind === "image" ? <AcmIcon name="insert.image" size={52} /> : null}
      </button>)}
    </div></div></div>
    <p className="rl-fixture-caption">Tool: {String(state.values["studio.tool"] ?? "select")} · Shape: {String(state.values["studio.shapes"])} · Zoom: {String(state.values["studio.zoom"])}% · {state.locked ? "Locked" : "Unlocked"}</p>
  </div>;
  return <div className="rl-table-fixture">
    <div className="rl-table-scroll"><table aria-label="Fictitious Account Directory">
      <thead><tr>{state.columns.map((column) => <th key={column} style={{ minWidth: state.columnWidths[column] ?? state.allColumnWidth }}>{column[0].toUpperCase() + column.slice(1)}</th>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id} style={{ height: state.rowHeights[row.id] ?? state.allRowHeight }}>{state.columns.map((column) => {
        const selected = hasAccountSelection(state) && state.selectedRow === row.id && state.selectedColumn === column;
        const highlighted = hasAccountSelection(state) && ((state.highlight === "row" || state.highlight === "both") && state.selectedRow === row.id || (state.highlight === "column" || state.highlight === "both") && state.selectedColumn === column);
        return <td key={column} className={(highlighted ? "rl-highlighted " : "") + (selected ? "rl-cell-selected" : "")}>
          {selected && state.editing ? <TextInput ref={editField} aria-label={"Edit " + column} value={row[column as keyof typeof row]} onChange={(event) => setState((current) => ({ ...current, rows: current.rows.map((item) => item.id === row.id ? { ...item, [column]: event.target.value } : item) }))} onBlur={() => setState((current) => ({ ...current, editing: false }))} onKeyDown={(event) => { if (event.key === "Enter" || event.key === "Escape") setState((current) => ({ ...current, editing: false })); }} /> :
            <button type="button" aria-label={row.name + ", " + column + ": " + row[column as keyof typeof row]} aria-pressed={selected} disabled={!state.values["account.cell"]} onClick={() => setState((current) => ({ ...current, selected: true, selectedRow: row.id, selectedColumn: column, editing: false }))}>{row[column as keyof typeof row]}</button>}
        </td>;
      })}</tr>)}</tbody>
    </table></div>
    {state.loading ? <p role="status">Refreshing accounts… (loading scenario)</p> : !rows.length ? <p role="status">No matching fictitious accounts.</p> : <p>{rows.length} fictitious results{state.query || state.filter ? " · filters active" : ""}</p>}
    {state.values["account.record"] && <section className="rl-record" aria-label="Demo Account Record"><h3>Account record</h3><p>{state.rows.find((row) => row.id === state.selectedRow)?.name ?? "Select a row to inspect its record."}</p><p>Details remain inside this demonstration.</p></section>}
  </div>;
}

export function RibbonPreview({ example, tab, setTab, state, setState, showScenarios = true, showFixture = true, showStatus = true, showBoundaries = false, popupRef }: {
  example: ExampleDefinition; tab: string; setTab: (tab: string) => void; state: DemoState; setState: StateSetter;
  showScenarios?: boolean; showFixture?: boolean; showStatus?: boolean; showBoundaries?: boolean; popupRef?: RefObject<HTMLDivElement | null>;
}) {
  const trigger = useRef<HTMLButtonElement | null>(null);
  const localPopup = useRef<HTMLDivElement | null>(null);
  const popup = popupRef ?? localPopup;
  const root = useRef<HTMLDivElement | null>(null);
  const menuAnchor = () => root.current?.querySelector<HTMLButtonElement>(state.menu === "columns" ? '[data-region="account.columns"]' : '[data-region="account.highlight.menu"]') ?? trigger.current;
  const closeMenu = (restoreFocus = true) => {
    const target = menuAnchor();
    setState((current) => ({ ...current, menu: null }));
    if (restoreFocus) target?.focus();
  };
  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (state.menu || example.id !== "studio" || isNativeEditingTarget(event.target)) return;
    const controls = example.tabs.flatMap((item) => item.groups.flatMap((group) => group.controls));
    const history = workspaceHistoryShortcut(event, navigator.platform);
    const zoom = workspaceZoomShortcut(event, true, navigator.platform);
    const command = history ? `studio.${history}` : zoom === "in" ? "studio.zoom-in" : zoom === "out" ? "studio.zoom-out" : zoom === "reset" ? "studio.fit" : null;
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
    {state.menu === "highlight" && <StudioAnchoredMenu anchor={menuAnchor} menuRef={popup} className={"rl-popup" + (showBoundaries ? " rl-outlines" : "")} aria-label="Highlight Mode" onClose={closeMenu}>
      <div className="rl-popup-heading"><strong>Highlight Mode</strong><button type="button" data-region="account.highlight.close" aria-label="Close Highlight Menu" onClick={() => closeMenu()}><AcmIcon name="action.close" size={20} /></button></div>
      {highlightDefinition?.children?.filter((control) => ["row", "column", "both"].some((mode) => control.id.endsWith("." + mode))).map((control) => <button key={control.id} data-region={control.id} type="button" role="menuitemradio" aria-checked={state.highlight === control.id.split(".").at(-1)} onClick={() => { setState((current) => runDemoCommand(current, control)); closeMenu(); }}><AcmIcon name={control.icon!} size={24} /><span>{control.label}</span>{state.highlight === control.id.split(".").at(-1) && <AcmIcon name="state.selected" size={16} />}</button>)}
    </StudioAnchoredMenu>}
    {state.menu === "columns" && <StudioAnchoredPopover anchor={menuAnchor} contentRef={popup} className={"rl-popup" + (showBoundaries ? " rl-outlines" : "")} label="Visible Columns" focusOnMount initialFocus={element => element.querySelector('[data-region="account.columns.close"]')} onClose={closeMenu}>
      <div className="rl-popup-heading"><strong>Visible Columns</strong><button type="button" data-region="account.columns.close" aria-label="Close Columns" onClick={() => closeMenu()}><AcmIcon name="action.close" size={20} /></button></div>
      {fixtureColumns.map((column) => <CheckboxControl key={column} checked={state.columns.includes(column)} disabled={state.columns.length === 1 && state.columns.includes(column)} onChange={checked => setState((current) => setAccountColumns(current, checked ? fixtureColumns.filter((name) => name === column || current.columns.includes(name)) : current.columns.filter((name) => name !== column)))} label={<>{column[0].toUpperCase() + column.slice(1)}</>} />)}
    </StudioAnchoredPopover>}
    {showScenarios && <div className="rl-scenario-bar" aria-label="Demonstration Scenarios">
      {example.id !== "skeleton" && <>
        <CheckboxControl checked={example.id === "account" ? hasAccountSelection(state) : state.selected} onChange={checked => setState((current) => setDemoSelection(current, checked, example.id === "account"))} label={<>Selection</>} />
        <CheckboxControl checked={state.locked} onChange={checked => setState((current) => ({ ...current, locked: checked, editing: false }))} label={<>Locked</>} />
        {example.id === "studio" ? <><CheckboxControl checked={state.handoff} onChange={checked => setState((current) => ({ ...current, handoff: checked }))} label={<>Media Handoff</>} /><CheckboxControl checked={state.linked} onChange={checked => setState((current) => ({ ...current, linked: checked }))} label={<>Linked Media</>} /></> :
          <><CheckboxControl checked={state.loading} onChange={checked => setState((current) => ({ ...current, loading: checked }))} label={<>Loading</>} /><CheckboxControl checked={state.empty} onChange={checked => setState((current) => ({ ...current, empty: checked, selected: false }))} label={<>Empty Results</>} /></>}
      </>}
      <button type="button" onClick={() => { setState(initialDemo(example)); setTab(example.initialTab); }}><AcmIcon name="action.reset" size={18} />Reset Demo</button>
    </div>}
    {showFixture && <Fixture example={example} state={state} setState={setState} />}
    {showStatus && <p className="rl-demo-status" role="status">{state.message}</p>}
  </div>;
}
