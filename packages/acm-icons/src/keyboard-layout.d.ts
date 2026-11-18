import type { KeyboardColours, KeyboardKeyId, KeyboardMode, KeyboardPlatform } from './keyboard.js';
export declare function fullKeyboardLayout(platform: KeyboardPlatform): { width: number; height: number; keys: { id: KeyboardKeyId; x: number; y: number; width: number; height: number; outline?: string; legendPlacement?: "bottom-left" | "bottom-right" | "bottom-centre" }[] };
export declare function createFullKeyboardSvg(platform: KeyboardPlatform, options?: KeyboardColours & { height?: number }): string;
export declare function windowsLayoutKeyAsset(id: KeyboardKeyId, options?: KeyboardColours & { height?: number; mode?: KeyboardMode }): { svg: string; width: number; height: number };
