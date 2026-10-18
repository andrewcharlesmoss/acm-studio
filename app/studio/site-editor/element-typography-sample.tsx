import { previewStyleDetails, type StyleSelection } from "./styles-preview-state";
import { resolvedTypographyFields, type TypographyRole } from "./typography-preview-model";

export type TypographyElementSampleRole = Extract<TypographyRole, "text" | "links" | "headings" | "captions" | "buttons">;

/** Compact content specimen; its row label keeps the interface typography. */
export function ElementTypographySample({ role, selection }: { role: TypographyElementSampleRole; selection: StyleSelection }) {
  const { typography, palette } = previewStyleDetails(selection);
  const fields = resolvedTypographyFields(typography, selection.typography ?? {}, role);
  return <span aria-hidden="true" className={`site-typography-element-mark is-${role}`} style={{
    fontFamily: fields.family,
    fontWeight: fields.weight,
    textDecoration: fields.decoration,
    textTransform: fields.transform,
    color: role === "buttons" ? palette.buttonText : role === "headings" ? palette.heading : palette.text,
    backgroundColor: role === "buttons" ? palette.buttonBackground : palette.colours[0],
  }}>Aa</span>;
}
