export type HsvColour = { hue: number; saturation: number; brightness: number; alpha: number };
export function hexToHsv(hex: string): HsvColour {
  const [r, g, b] = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const high = Math.max(r, g, b), low = Math.min(r, g, b), span = high - low;
  const hue = span === 0 ? 0 : high === r ? ((g - b) / span + 6) % 6 : high === g ? (b - r) / span + 2 : (r - g) / span + 4;
  return { hue: hue * 60, saturation: high === 0 ? 0 : span / high * 100, brightness: high * 100, alpha: hex.length === 9 ? parseInt(hex.slice(7), 16) / 255 * 100 : 100 };
}
export function hsvToHex({ hue, saturation, brightness, alpha }: HsvColour): string {
  const s = saturation / 100, v = brightness / 100;
  const channel = (offset: number) => {
    const phase = (offset + hue / 60) % 6;
    return Math.round(255 * v * (1 - s * Math.max(0, Math.min(phase, 4 - phase, 1)))).toString(16).padStart(2, "0");
  };
  return `#${channel(5)}${channel(3)}${channel(1)}${alpha < 100 ? Math.round(alpha / 100 * 255).toString(16).padStart(2, "0") : ""}`.toUpperCase();
}
export function rgbChannels(hex: string) { return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)); }
export function hsvToHsl({ hue, saturation, brightness }: HsvColour) {
  const lightness = brightness / 100 * (1 - saturation / 200);
  return [Math.round(hue), Math.round(lightness === 0 || lightness === 1 ? 0 : (brightness / 100 - lightness) / Math.min(lightness, 1 - lightness) * 100), Math.round(lightness * 100)];
}
export function hslToHsv(hue: number, saturation: number, lightness: number, alpha: number): HsvColour {
  const l = lightness / 100, s = saturation / 100, v = l + s * Math.min(l, 1 - l);
  return { hue, saturation: v === 0 ? 0 : 200 * (1 - l / v), brightness: v * 100, alpha };
}
