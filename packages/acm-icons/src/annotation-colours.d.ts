export type AnnotationColours = { ink: string; surface: string; highlight: string };
export type AnnotationPath = { d: string; fill: string; stroke: string; strokeWidth: number };
export declare function hasAnnotationColours(name: string): boolean;
export declare function annotationArtwork(name: string, scale: string, colours: AnnotationColours): AnnotationPath[];
export declare function createAnnotationSvg(name: string, scale: string, size: number, colours: AnnotationColours): string;
