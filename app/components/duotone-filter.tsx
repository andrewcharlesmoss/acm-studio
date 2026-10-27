export type DuotoneValue = {
    dark: string;
    light: string;
};
export function duotoneChannels(colour: string) {
    const hex = /^#[\da-f]{6}$/i.test(colour) ? colour.slice(1) : '000000';
    return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
}
export function DuotoneFilter({ id, value }: {
    id: string;
    value: DuotoneValue;
}) {
    const dark = duotoneChannels(value.dark), light = duotoneChannels(value.light);
    return <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}><defs><filter id={id} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/><feComponentTransfer><feFuncR type="table" tableValues={`${dark[0]} ${light[0]}`}/><feFuncG type="table" tableValues={`${dark[1]} ${light[1]}`}/><feFuncB type="table" tableValues={`${dark[2]} ${light[2]}`}/></feComponentTransfer></filter></defs></svg>;
}
