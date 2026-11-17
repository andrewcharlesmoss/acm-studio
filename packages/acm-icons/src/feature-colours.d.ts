export type FeaturePath = { d: string; fill: string; fillRule?: string; stroke: string; strokeWidth: number };
export declare function hasFeatureColours(name: string): boolean;
export declare function featureArtwork(name: string, scale: string, colour: string): FeaturePath[];
export declare function createFeatureSvg(name: string, scale: string, size: number, colour: string): string;
