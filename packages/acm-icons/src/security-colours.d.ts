export type SecurityColours = { gold: string; neutral: string; ink: string; surface: string; subtle: string };
export type SecurityPath = { d: string; fill: string; stroke: string; strokeWidth: number };
export declare function hasSecurityColours(name: string): boolean;
export declare function securityArtwork(name: string, scale: string, colours: SecurityColours): SecurityPath[];
export declare function createSecuritySvg(name: string, scale: string, size: number, colours: SecurityColours): string;
