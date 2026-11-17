import type { IconName, IconScale } from "../dist/index.js";
export type BrandPath = { d: string; fill: string; stroke: string; strokeWidth?: number; fillRule?: "evenodd"; transform?: string };
export type SocialBrandAsset = { background?: { fill: string; rx: number }; gradient?: { x1: string; y1: string; x2: string; y2: string; stops: [string, string][] }; paths: BrandPath[] };
export declare function hasSocialBrandVariant(name: string): boolean;
export declare function socialBrandAsset(name: IconName, scale?: IconScale): SocialBrandAsset;
export declare function createSocialBrandSvg(name: IconName, scale?: IconScale, size?: number): string;
