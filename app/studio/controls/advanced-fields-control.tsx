"use client";

import { SettingLabel } from "./setting-inheritance";
import { FormField } from "./form-field";
import { TextArea, TextInput } from "./native-fields";
import { useId, useState } from "react";

export type AdvancedFields = { anchor: boolean; className: boolean; additionalCss: boolean };
export type AdvancedField = "anchor" | "className" | "additionalCss";

/** Shared presentation; callers retain their own storage and validation rules. */
export function AdvancedFieldsControl({ fields, style, blockName, inheritedAdditionalCss, resetAdditionalCss, placeholders = false, onChange: update }: {
  fields: AdvancedFields;
  style: Partial<Record<AdvancedField, string>>;
  blockName: string;
  inheritedAdditionalCss?: string;
  resetAdditionalCss?: () => void;
  placeholders?: boolean;
  onChange: (field: AdvancedField, value: string) => void;
}) {
  const fieldId = useId();
  const [emptyCssDraft, setEmptyCssDraft] = useState<string | null>(null);
  return <>
    {fields.anchor ? <FormField className="advanced-field" id={`${fieldId}-anchor`} label="HTML anchor" description="Enter a word or two, without spaces, to make a unique web address just for this block, called an “anchor”. Then, you’ll be able to link directly to this section of your page.">{attributes => <TextInput {...attributes} value={style.anchor ?? ""} onChange={event => update("anchor", event.target.value)} placeholder={!placeholders ? undefined : "section-name"} />}</FormField> : null}
    {fields.className ? <FormField className="advanced-field" id={`${fieldId}-class-name`} label="Additional CSS class(es)" description="Separate multiple classes with spaces.">{attributes => <TextInput {...attributes} value={style.className ?? ""} onChange={event => update("className", event.target.value)} placeholder={!placeholders ? undefined : "custom-class"} />}</FormField> : null}
    {fields.additionalCss ? <FormField className="advanced-field" id={`${fieldId}-additional-css`} label={<SettingLabel>Additional CSS</SettingLabel>} description={<>Add your own CSS to customise the appearance of the {blockName} block. You do not need to include a CSS selector, just add the property and value, e.g. <code>color: red;</code>.</>}>{attributes => <TextArea {...attributes} value={emptyCssDraft !== null ? emptyCssDraft : style.additionalCss ?? inheritedAdditionalCss ?? ""} onChange={event => { const value = event.target.value; setEmptyCssDraft(value.trim() ? null : value); update("additionalCss", value); }} onBlur={() => setEmptyCssDraft(null)} maxLength={6000} rows={5} />}</FormField> : null}
    {fields.additionalCss && resetAdditionalCss ? <button type="button" className="paragraph-reset-button" onClick={() => { setEmptyCssDraft(null); resetAdditionalCss(); }}>Reset Additional CSS</button> : null}
  </>;
}
