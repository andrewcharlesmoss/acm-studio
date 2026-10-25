import type { PreviewBlockId } from "./blocks-preview-model";
/** Captured from the active WordPress Styles → Blocks panes on 20 October 2026.
 * These are global-style compositions, independent from editor capability profiles.
 */
export type BlockStyleControl = 'colour' | 'font' | 'size' | 'appearance' | 'lineHeight' | 'letterSpacing' | 'textIndent' | 'indentAll' | 'columns' | 'decoration' | 'orientation' | 'case' | 'align' | 'padding' | 'cellPadding' | 'margin' | 'gap' | 'minHeight' | 'minWidth' | 'width' | 'border' | 'radius' | 'shadow' | 'link' | 'heading' | 'button' | 'duotone' | 'enlarge';
export type BlockStyleProfile = {
    typography: BlockStyleControl[];
    dimensions: BlockStyleControl[];
    border: BlockStyleControl[];
    elements: BlockStyleControl[];
    background: boolean;
    backgroundImage?: boolean;
    backgroundGradient?: boolean;
    filters?: boolean;
    settings?: boolean;
    verticalMargin?: boolean;
    variations: {
        id: string;
        label: string;
    }[];
};
const text: BlockStyleControl[] = ['colour', 'font', 'size', 'appearance', 'lineHeight', 'letterSpacing', 'decoration', 'case'];
const border: BlockStyleControl[] = ['border', 'radius'];
const variation = (...names: string[]) => names.map(label => ({ id: label.toLowerCase().replaceAll(' ', '-'), label }));
const profile = (patch: Partial<BlockStyleProfile> = {}): BlockStyleProfile => ({ typography: [...text], dimensions: ['padding', 'margin'], border: [...border], elements: [], background: true, variations: [], ...patch });
const container = (button = false) => profile({ backgroundImage: true, verticalMargin: true, dimensions: ['padding', 'margin', 'gap', 'minHeight', 'minWidth'], border: [...border, 'shadow'], elements: button ? ['link', 'button', 'heading'] : ['link', 'heading'] });
const metadata = () => profile({ typography: [...text, 'align'], elements: ['link'] });
export const blockStyleProfiles: Record<PreviewBlockId, BlockStyleProfile> = {
    paragraph: profile({ typography: ['colour', 'font', 'size', 'appearance', 'lineHeight', 'letterSpacing', 'textIndent', 'indentAll', 'columns', 'decoration', 'orientation', 'case', 'align'], elements: ['link'], variations: variation('Display', 'Subtitle', 'Annotation') }),
    image: profile({ typography: [], dimensions: ['margin'], border: ['border', 'radius', 'shadow'], background: false, filters: true, settings: true, variations: variation('Rounded') }),
    heading: profile({ typography: [...text.slice(0, 7), 'orientation', 'case', 'align'], elements: ['link'], variations: variation('Display', 'Subtitle', 'Annotation') }),
    // Gutenberg's List block exposes typography, alignment, and spacing between entries.
    list: profile({ typography: [...text, 'align'], dimensions: ['padding', 'margin', 'gap'], elements: ['link'] }),
    quote: profile({ backgroundImage: true, dimensions: ['padding', 'margin', 'gap', 'minHeight'], elements: ['link', 'heading'], variations: variation('Plain') }),
    button: profile({ typography: [...text.slice(0, 7), 'orientation', 'case', 'align'], dimensions: ['padding', 'width'], border: ['border', 'radius', 'shadow'], variations: variation('Outline') }),
    buttons: profile({ verticalMargin: true, typography: text.filter(id => id !== 'colour'), dimensions: ['padding', 'margin', 'gap'] }),
    code: profile({ verticalMargin: true }),
    pullquote: profile({ typography: [...text, 'align'], backgroundImage: true, dimensions: ['padding', 'margin', 'minHeight'], elements: ['link'] }),
    search: profile({ dimensions: ['margin'] }),
    divider: profile({ typography: [], dimensions: ['margin'], border: [], verticalMargin: true, variations: variation('Wide Line', 'Dots') }),
    group: container(true), row: container(true), stack: container(true), grid: container(true), section: container(),
    columns: profile({ verticalMargin: true, dimensions: ['padding', 'margin', 'gap'], border: [...border, 'shadow'], elements: ['link', 'button', 'heading'] }),
    column: profile({ dimensions: ['padding', 'gap'], border: [...border, 'shadow'], elements: ['link', 'button', 'heading'] }),
    spacer: profile({ typography: [], background: false, border: [], dimensions: ['margin'], verticalMargin: true }),
    embed: profile({ typography: [], background: false, border: [], dimensions: ['margin'] }),
    footnotes: profile({ typography: [...text.slice(0, 7), 'orientation', 'case'], backgroundGradient: false, elements: ['link'] }), field: metadata(),
    'document-title': metadata(), 'document-subtitle': metadata(), 'post-author': metadata(), 'post-date': metadata(),
    'reading-time': profile({ typography: [...text, 'align'] }),
    'cover-image': profile({ typography: [], background: false, dimensions: ['padding', 'margin'], border: [...border, 'shadow'], filters: true }),
    'social-icons': profile({ typography: [], dimensions: ['padding', 'margin', 'gap'] }),
    'social-linkedin': profile({ typography: [], dimensions: ['padding', 'margin'] }),
    'social-tiktok': profile({ typography: [], dimensions: ['padding', 'margin'] }),
    table: profile({ dimensions: ['cellPadding', 'padding', 'margin'], border: ['border'], variations: variation('Stripes') }),
};
export const blockStyleLabels: Record<BlockStyleControl, string> = { colour: 'Colour', font: 'Font', size: 'Size', appearance: 'Appearance', lineHeight: 'Line height', letterSpacing: 'Letter spacing', textIndent: 'Line indent', indentAll: 'Indent all paragraphs', columns: 'Columns', decoration: 'Decoration', orientation: 'Orientation', case: 'Letter case', align: 'Text alignment', padding: 'Padding', cellPadding: 'Cell padding', margin: 'Margin', gap: 'Block spacing', minHeight: 'Minimum height', minWidth: 'Minimum width', width: 'Width', border: 'Border', radius: 'Radius', shadow: 'Shadow', link: 'Link', heading: 'Heading', button: 'Button', duotone: 'Duotone', enlarge: 'Enlarge on click' };
