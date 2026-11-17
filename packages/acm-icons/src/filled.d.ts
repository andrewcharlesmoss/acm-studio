import type { IconName, IconScale } from "../dist/index.js";
export declare function hasFilledIcon(name: string): boolean;
export declare function filledIconPaths(name: IconName, scale: IconScale): { d: string }[];
export declare function createFilledSvg(name: IconName, scale: IconScale, size: number): string;

export declare function filledIconArtwork(name: IconName, scale: IconScale): { paths: { d: string }[]; faces: number[]; cutouts: number[]; solidCutouts: number[]; solidStrokedCutouts: number[]; retainedSolids: number[]; strokes: number[]; strokeWidth: number };
