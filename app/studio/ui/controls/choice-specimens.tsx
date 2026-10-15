"use client";

import { useState } from "react";
import { CheckboxControl } from "../../controls/checkbox-control";
import { RadioGroup } from "../../controls/radio-group";

export function CheckboxSpecimen() {
  const [checked, setChecked] = useState(false);
  const [choices, setChoices] = useState([true, false]);
  const all = choices.every(Boolean);
  const mixed = choices.some(Boolean) && !all;
  return <div className="ui-choice-specimen">
    <CheckboxControl label="Example checkbox" checked={checked} onChange={setChecked} />
    <fieldset className="ui-choice-fieldset"><legend>Indeterminate selection</legend>
      <CheckboxControl label="Select all examples" checked={all} indeterminate={mixed} onChange={value => setChoices([value, value])} />
      {choices.map((value, index) => <CheckboxControl key={index} label={`Example ${index + 1}`} checked={value} onChange={next => setChoices(current => current.map((item, itemIndex) => itemIndex === index ? next : item))} />)}
    </fieldset>
    <CheckboxControl label="Disabled unchecked checkbox" checked={false} disabled onChange={() => {}} />
    <CheckboxControl label="Disabled checked checkbox" checked disabled onChange={() => {}} />
    <CheckboxControl label="Disabled indeterminate checkbox" checked={false} indeterminate disabled onChange={() => {}} />
    <p role="status">Checkbox: {checked ? "checked" : "unchecked"}. Selection: {mixed ? "mixed" : all ? "all" : "none"}.</p>
    <p>Tab to a checkbox and press Space to toggle it. The Select all checkbox shows a mixed state when only some examples are selected. Disabled controls are skipped.</p>
  </div>;
}

export function RadioGroupSpecimen() {
  const [value, setValue] = useState<string | undefined>("first");
  const [empty, setEmpty] = useState<string | undefined>();
  return <div className="ui-choice-specimen">
    <RadioGroup label="Example radio group" value={value} onChange={setValue} options={[{ value: "first", label: "First option" }, { value: "unavailable", label: "Unavailable option", disabled: true }, { value: "second", label: "Second option" }, { value: "third", label: "Third option" }]} />
    <RadioGroup label="Initially unselected group" value={empty} onChange={setEmpty} options={[{ value: "one", label: "Choice one" }, { value: "two", label: "Choice two" }]} />
    <RadioGroup label="Disabled radio group" value="selected" disabled onChange={() => {}} options={[{ value: "selected", label: "Disabled selected option" }, { value: "unselected", label: "Disabled unselected option" }]} />
    <p role="status">Selected: {value ?? "none"}. Independent group: {empty ?? "none"}.</p>
    <p>Tab into a group. Arrow keys move and select among enabled choices; Space selects the focused choice. Tab leaves the group. Each group keeps its own selection.</p>
  </div>;
}
