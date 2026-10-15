"use client";

import { useRef, useState } from "react";
import { TextInput, TextArea, SelectControl, SearchInput, NumberInput } from "../../controls/native-fields";
import { FormField } from "../../controls/form-field";
import { NumberUnitField } from "../../controls/number-unit-field";
import { StudioButton } from "../../controls/button";
import { StudioTooltipGroup } from "../../controls/tooltip-group";
import { AcmIcon } from "@acm/icons/react";
import { StudioIcon } from "../../studio-icons";

export const commonFieldIds = new Set(["text-input", "text-area", "select-dropdown", "search-field", "number-field", "number-unit-field", "button", "tooltip", "form-field"]);

export function CommonFieldSpecimen({ kind }: { kind: string }) {
  const [value, setValue] = useState(kind === "text-area" ? "First line\nSecond line" : kind === "number-field" ? "10" : "Example value");
  const [invalid, setInvalid] = useState("");
  const [selection, setSelection] = useState("second");
  const [query, setQuery] = useState("");
  const [number, setNumber] = useState("24");
  const [unit, setUnit] = useState("px");
  const [actions, setActions] = useState(0);
  const [pressed, setPressed] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const results = ["Header", "Navigation", "Paragraph", "Image"].filter(item => item.toLowerCase().includes(query.toLowerCase()));
  const requiredError = invalid.trim() ? undefined : "Enter a value.";
  let content;
  switch (kind) {
    case "text-input": content = <>
      <FormField label="Text input example" description="A controlled text value.">{attrs => <TextInput {...attrs} value={value} onChange={event => setValue(event.target.value)} />}</FormField>
      <FormField label="Empty text input">{attrs => <TextInput {...attrs} placeholder="Enter some text" />}</FormField>
      <FormField label="Read-only text input">{attrs => <TextInput {...attrs} value="Read-only value" readOnly />}</FormField>
      <FormField label="Disabled text input">{attrs => <TextInput {...attrs} value="Disabled value" disabled />}</FormField>
      <FormField label="Required text input" error={requiredError}>{attrs => <TextInput {...attrs} required value={invalid} onChange={event => setInvalid(event.target.value)} />}</FormField>
    </>; break;
    case "text-area": content = <>
      <FormField label="Text area example" description="Enter creates a new line. Up to 120 characters.">{attrs => <TextArea {...attrs} rows={3} maxLength={120} value={value} onChange={event => setValue(event.target.value)} />}</FormField>
      <FormField label="Empty text area">{attrs => <TextArea {...attrs} rows={2} placeholder="Enter multiple lines" />}</FormField>
      <FormField label="Read-only text area">{attrs => <TextArea {...attrs} rows={2} value="Read-only text" readOnly />}</FormField>
      <FormField label="Disabled text area">{attrs => <TextArea {...attrs} rows={2} value="Disabled text" disabled />}</FormField>
      <FormField label="Required text area" error={requiredError}>{attrs => <TextArea {...attrs} rows={2} required value={invalid} onChange={event => setInvalid(event.target.value)} />}</FormField>
    </>; break;
    case "select-dropdown": content = <>
      <FormField label="Select example" description="Native keyboard selection and type-ahead.">{attrs => <SelectControl {...attrs} value={selection} onChange={event => setSelection(event.target.value)}><option value="first">First option</option><option value="unavailable" disabled>Unavailable option</option><optgroup label="More options"><option value="second">Second option</option><option value="third">Third option</option></optgroup></SelectControl>}</FormField>
      <FormField label="Required select" error={invalid ? undefined : "Choose an option."}>{attrs => <SelectControl {...attrs} required value={invalid} onChange={event => setInvalid(event.target.value)}><option value="" disabled>Choose an option</option><option value="chosen">Available option</option></SelectControl>}</FormField>
      <FormField label="Disabled select">{attrs => <SelectControl {...attrs} disabled value="fixed"><option value="fixed">Selected value</option></SelectControl>}</FormField>
      <p role="status">Selected: {selection}.</p>
    </>; break;
    case "search-field": content = <>
      <FormField label="Search example" description="Filters temporary example items as you type.">{attrs => <SearchInput {...attrs} ref={search} value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a block" />}</FormField>
      <StudioButton type="button" variant="secondary" disabled={!query} onClick={() => { setQuery(""); search.current?.focus(); }}><StudioIcon name="close" size={18} />Clear Search</StudioButton>
      <p role="status">{results.length} results{results.length ? `: ${results.join(", ")}` : ". No matching examples."}</p>
      <FormField label="Read-only search">{attrs => <SearchInput {...attrs} value="Read-only query" readOnly />}</FormField>
      <FormField label="Disabled search">{attrs => <SearchInput {...attrs} disabled placeholder="Search unavailable" />}</FormField>
    </>; break;
    case "number-field": content = <>
      <FormField label="Number example" description="0–100, in steps of 5. Arrow keys use the native step.">{attrs => <NumberInput {...attrs} min={0} max={100} step={5} value={value} onChange={event => setValue(event.target.value)} />}</FormField>
      <FormField label="Empty number">{attrs => <NumberInput {...attrs} placeholder="Automatic" />}</FormField>
      <FormField label="Read-only number">{attrs => <NumberInput {...attrs} value={20} readOnly />}</FormField>
      <FormField label="Disabled number">{attrs => <NumberInput {...attrs} value={20} disabled />}</FormField>
      <FormField label="Required number" error={invalid === "" ? "Enter a number from 0 to 10." : Number(invalid) < 0 || Number(invalid) > 10 ? "Use a value from 0 to 10." : undefined}>{attrs => <NumberInput {...attrs} required min={0} max={10} value={invalid} onChange={event => setInvalid(event.target.value)} />}</FormField>
      <p role="status">Value: {value || "empty"}.</p>
    </>; break;
    case "number-unit-field": content = <>
      <FormField label="Measurement example" description="Changing the unit retains the numeric value; the setting owns conversion.">{attrs => <NumberUnitField inputProps={{ ...attrs, min: 0, max: 200, step: 1, value: number, onChange: event => setNumber(event.target.value) }} unitProps={{ "aria-label": "Measurement unit", value: unit, onChange: event => setUnit(event.target.value) }} units={["px", "rem", "em", "%"]} />}</FormField>
      <FormField label="Empty measurement">{attrs => <NumberUnitField inputProps={{ ...attrs, placeholder: "Automatic" }} unitProps={{ "aria-label": "Empty measurement unit", defaultValue: "px" }} units={["px", "rem"]} />}</FormField>
      <FormField label="Disabled measurement">{attrs => <NumberUnitField inputProps={{ ...attrs, value: 16, disabled: true }} unitProps={{ "aria-label": "Disabled measurement unit", value: "px", disabled: true }} units={["px", "rem"]} />}</FormField>
      <p role="status">Measurement: {number || "automatic"}{number ? unit : ""}.</p>
    </>; break;
    case "button": content = <>
      <div className="ui-common-action-row"><StudioButton type="button" onClick={() => setActions(value => value + 1)}>Primary Action</StudioButton><StudioButton type="button" variant="secondary" onClick={() => setActions(value => value + 1)}>Secondary Action</StudioButton><StudioButton type="button" variant="text" onClick={() => setActions(value => value + 1)}>Text Action</StudioButton><StudioButton type="button" aria-label="Example icon action" onClick={() => setActions(value => value + 1)}><AcmIcon name="action.search" size={18} /></StudioButton><StudioButton type="button" disabled>Disabled Action</StudioButton><StudioButton type="button" variant="secondary" aria-pressed={pressed} onClick={() => setPressed(value => !value)}>Pressed State</StudioButton></div>
      <p role="status">Actions: {actions}. Pressed: {pressed ? "on" : "off"}.</p><p>Tab to a button and use Enter or Space. Disabled actions are skipped.</p>
    </>; break;
    case "tooltip": content = <>
      <StudioTooltipGroup className="ui-common-action-row"><StudioButton type="button" variant="secondary" data-studio-tooltip="This description is shown by the production tooltip group.">First Tooltip</StudioButton><StudioButton type="button" variant="secondary" data-studio-tooltip="Nearby tooltips share the same warm hover delay.">Second Tooltip</StudioButton><StudioButton type="button" disabled data-studio-tooltip="Unavailable action">Disabled Tooltip Action</StudioButton></StudioTooltipGroup>
      <p>Hover for the shared delay, or Tab to a button for its description. Escape dismisses the tooltip; moving focus or clicking also dismisses it.</p>
    </>; break;
    default: content = <>
      <FormField label="Labelled field" description="This help text is associated with its input.">{attrs => <TextInput {...attrs} value={value} onChange={event => setValue(event.target.value)} />}</FormField>
      <FormField label="Validated field" description="The example owns this required-value rule." error={requiredError}>{attrs => <TextInput {...attrs} required value={invalid} onChange={event => setInvalid(event.target.value)} />}</FormField>
      <p>Labels focus their inputs. Help and error messages are associated through aria-describedby; the owner supplies validation and disabled/read-only state.</p>
    </>;
  }
  return <div className="ui-common-control-specimen">{content}</div>;
}
