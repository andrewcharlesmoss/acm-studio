export type StatusColourRole = 'information' | 'warning' | 'alert' | 'success';
export declare function statusColourRole(name: string): StatusColourRole | undefined;

export declare function createStatusSvg(name: string, scale: string, size: number, colour: string): string;
export declare function statusForeground(colour: string): '#000000' | '#FFFFFF';
