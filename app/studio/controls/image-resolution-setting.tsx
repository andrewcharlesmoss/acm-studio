"use client";
import { createContext, useContext, type ReactNode } from "react";
import { imageRenditionResourceKey, validImageResolution, type ImageResolution } from "../../content/image-resolution";
import { SelectControl } from "./native-fields";

export type ImageResolutionChoice = { label: string; resolution: ImageResolution };
export type ImageResolutionChoices = Readonly<Record<string, readonly ImageResolutionChoice[]>>;
const ImageResolutionChoicesContext = createContext<ImageResolutionChoices>({});
export function ImageResolutionChoicesProvider({ choices, children }: { choices: ImageResolutionChoices; children: ReactNode }) {
  return <ImageResolutionChoicesContext.Provider value={choices}>{children}</ImageResolutionChoicesContext.Provider>;
}
export function useImageResolutionChoices(mediaId?: string) {
  const choices = useContext(ImageResolutionChoicesContext);
  return mediaId && Object.hasOwn(choices, mediaId) ? choices[mediaId] : undefined;
}

/** Hosts provide available immutable sizes and own persistence of the choice. */
export function ImageResolutionSetting({ value, choices, onChange, disabled = false }: { value?: ImageResolution; choices: readonly ImageResolutionChoice[]; onChange: (value?: ImageResolution) => void; disabled?: boolean }) {
  const optionValue = (resolution: ImageResolution) => imageRenditionResourceKey("", resolution);
  const current = value === undefined ? "full" : validImageResolution(value) ? optionValue(value) : "invalid";
  const known = choices.some(choice => optionValue(choice.resolution) === current);
  return <label><span>Resolution</span><SelectControl value={current} disabled={disabled} onChange={event => {
    if (event.target.value === "full") { onChange(undefined); return; }
    const selected = choices.find(choice => optionValue(choice.resolution) === event.target.value);
    if (selected) onChange(selected.resolution);
  }}>
    <option value="full">Full Size</option>
    {value !== undefined && !known ? <option value={current} disabled>Selected size unavailable</option> : null}
    {choices.map(choice => <option key={optionValue(choice.resolution)} value={optionValue(choice.resolution)}>{choice.label}</option>)}
  </SelectControl></label>;
}
