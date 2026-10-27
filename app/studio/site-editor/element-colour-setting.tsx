"use client";
import { ElementColourSetting as SharedElementColourSetting } from "../controls/element-colour-setting";
import type { ComponentProps } from "react";
import { previewStyleDetails, type StyleSelection } from "./styles-preview-state";
import { previewColourEntries, previewPaletteReference, previewColourValue, type PreviewGradient } from "./colours-preview-model";

/** Website palette references stay with their owner; presentation is shared. */
export function ElementColourSetting({ selection, gradient, gradientId, hover, ...props }: Omit<ComponentProps<typeof SharedElementColourSetting>, "palette" | "paletteValue" | "gradientChoices"> & { selection: StyleSelection; gradientId?: string }) {
  const { palette } = previewStyleDetails(selection);
  const settings = selection.colours ?? {};
  return <SharedElementColourSetting {...props}
    palette={previewColourEntries(palette, settings).map(({ key, label, colour }) => ({ key, label, colour }))}
    paletteValue={entry => previewPaletteReference(entry.key)}
    gradient={gradientId ? settings.gradients?.[gradientId]?.gradient ?? settings.retiredGradients?.[gradientId] ?? gradient : gradient}
    hover={previewColourValue(hover, palette, settings)}
    gradientChoices={Object.values(settings.gradients ?? {}).filter((item): item is PreviewGradient => Boolean(item))} />;
}
