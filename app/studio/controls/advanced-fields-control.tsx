"use client";

import { useId } from "react";
import { StudioIcon } from "../studio-icons";

export type AdvancedFields = { anchor: boolean; className: boolean; additionalCss: boolean };
export type AdvancedField = "anchor" | "className" | "additionalCss";

/** Shared presentation; callers retain their own storage and validation rules. */
export function AdvancedFieldsControl({ fields, style, blockName, placeholders = false, onChange: update }: {
  fields: AdvancedFields;
  style: Partial<Record<AdvancedField, string>>;
  blockName: string;
  placeholders?: boolean;
  onChange: (field: AdvancedField, value: string) => void;
}) {
  const fieldId = useId();
  return <>
    {fields.anchor ? <div className="advanced-field"><label htmlFor={`${fieldId}-anchor`}><span>HTML anchor</span></label><input id={`${fieldId}-anchor`} aria-describedby={`${fieldId}-anchor-help`} value={style.anchor ?? ""} onChange={(event) => update("anchor", event.target.value)} placeholder={!placeholders ? undefined : "section-name"} /><p className="setting-note" id={`${fieldId}-anchor-help`}>Enter a word or two, without spaces, to make a unique web address just for this block, called an “anchor”. Then, you’ll be able to link directly to this section of your page. <a href="https://wordpress.org/documentation/article/page-jumps/">Learn more about anchors <StudioIcon name="external" size={14} /></a></p></div> : null}
    {fields.className ? <div className="advanced-field"><label htmlFor={`${fieldId}-class-name`}><span>Additional CSS class(es)</span></label><input id={`${fieldId}-class-name`} aria-describedby={`${fieldId}-class-name-help`} value={style.className ?? ""} onChange={(event) => update("className", event.target.value)} placeholder={!placeholders ? undefined : "custom-class"} /><p className="setting-note" id={`${fieldId}-class-name-help`}>Separate multiple classes with spaces.</p></div> : null}
    {fields.additionalCss ? <div className="advanced-field"><label htmlFor={`${fieldId}-additional-css`}><span>Additional CSS</span></label><textarea id={`${fieldId}-additional-css`} aria-describedby={`${fieldId}-additional-css-help`} value={style.additionalCss ?? ""} onChange={(event) => update("additionalCss", event.target.value)} maxLength={6000} rows={5} /><p className="setting-note" id={`${fieldId}-additional-css-help`}>Add your own CSS to customise the appearance of the {blockName} block. You do not need to include a CSS selector, just add the property and value, e.g. <code>colour: red;</code>.</p></div> : null}
  </>;
}
