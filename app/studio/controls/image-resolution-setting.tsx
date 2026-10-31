"use client";
import { createContext, useContext, type ReactNode } from "react";
import { imageRenditionResourceKey, validImageResolution, type ImageResolution } from "../../content/image-resolution";
import { SelectControl } from "./native-fields";

export type ImageResolutionChoice = { label: string; resolution: ImageResolution };
export type ImageResolutionChoices = Readonly<Record<string, readonly ImageResolutionChoice[]>>;
type ImageResolutionActions = { canPrepare: boolean; preparingMediaId?: string; onPrepare?: (mediaId: string) => void };
const ImageResolutionChoicesContext = createContext<ImageResolutionChoices>({});
const ImageResolutionActionsContext = createContext<ImageResolutionActions>({ canPrepare: false });
export function ImageResolutionChoicesProvider({ choices, canPrepare = false, preparingMediaId, onPrepare, children }: { choices: ImageResolutionChoices; canPrepare?: boolean; preparingMediaId?: string; onPrepare?: (mediaId: string) => void; children: ReactNode }) {
  return <ImageResolutionChoicesContext.Provider value={choices}><ImageResolutionActionsContext.Provider value={{ canPrepare, preparingMediaId, onPrepare }}>{children}</ImageResolutionActionsContext.Provider></ImageResolutionChoicesContext.Provider>;
}
export function useImageResolutionChoices(mediaId?: string) {
  const choices = useContext(ImageResolutionChoicesContext);
  const actions = useContext(ImageResolutionActionsContext);
  return mediaId && Object.hasOwn(choices, mediaId) ? {
    choices: choices[mediaId],
    canPrepare: actions.canPrepare && Boolean(actions.onPrepare),
    preparing: actions.preparingMediaId === mediaId,
    onPrepare: actions.onPrepare ? () => actions.onPrepare!(mediaId) : undefined,
  } : undefined;
}

/** Hosts provide available immutable sizes and own persistence of the choice. */
export function ImageResolutionSetting({ value, choices, onChange, disabled = false, canPrepare = false, preparing = false, onPrepare }: { value?: ImageResolution; choices: readonly ImageResolutionChoice[]; onChange: (value?: ImageResolution) => void; disabled?: boolean; canPrepare?: boolean; preparing?: boolean; onPrepare?: () => void }) {
  const optionValue = (resolution: ImageResolution) => imageRenditionResourceKey("", resolution);
  const current = value === undefined ? "full" : validImageResolution(value) ? optionValue(value) : "invalid";
  const known = choices.some(choice => optionValue(choice.resolution) === current);
  return <><label><span>Resolution</span><SelectControl value={current} disabled={disabled} onChange={event => {
    if (event.target.value === "full") { onChange(undefined); return; }
    const selected = choices.find(choice => optionValue(choice.resolution) === event.target.value);
    if (selected) onChange(selected.resolution);
  }}>
    <option value="full">Full Size</option>
    {value !== undefined && !known ? <option value={current} disabled>Selected size unavailable</option> : null}
    {choices.map(choice => <option key={optionValue(choice.resolution)} value={optionValue(choice.resolution)}>{choice.label}</option>)}
  </SelectControl></label>
    {canPrepare && choices.length === 0 ? <button className="button-secondary" type="button" disabled={disabled || preparing} onClick={onPrepare}>{preparing ? "Preparing image sizes…" : "Prepare image sizes"}</button> : null}
  </>;
}
