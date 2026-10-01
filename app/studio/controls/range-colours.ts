const RANGE_STATE_DARKENING = 0.12;

/** Return a darker slider state colour, keeping the shared hue and saturation. */
export function deriveSliderStateColour(colour: string): string {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(colour);
  if (!match) return colour;

  const channels = match.slice(1).map(channel => Math.round(parseInt(channel, 16) * (1 - RANGE_STATE_DARKENING)));
  return `#${channels.map(channel => channel.toString(16).padStart(2, "0")).join("")}`;
}
