import type { KeyboardColours, KeyboardKeyId, KeyboardPlatform } from './keyboard.js';
export declare function fullKeyboardLayout(platform: KeyboardPlatform): { width: number; height: number; keys: { id: KeyboardKeyId; x: number; y: number; width: number; height: number; legendPlacement?: "bottom-left" | "bottom-right" | "bottom-centre" }[] };
export declare function createFullKeyboardSvg(platform: KeyboardPlatform, options?: KeyboardColours & { height?: number }): string;
