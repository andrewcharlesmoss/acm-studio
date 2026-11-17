export type IllustrationColours = { accent: string; gold: string; green: string; ink: string; surface: string; subtle: string };
export type IllustrationPath = { d: string; fill: string; fillRule?: string; stroke: string; strokeWidth: number };
export declare function hasIllustrationColours(name: string): boolean;
export declare function illustrationArtwork(name: string, scale: string, colours: IllustrationColours): IllustrationPath[];
export declare function createIllustrationSvg(name: string, scale: string, size: number, colours: IllustrationColours): string;
