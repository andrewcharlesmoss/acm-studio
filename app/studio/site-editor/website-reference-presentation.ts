/** Painted Twenty Twenty-Five defaults shared by real fixture pages and specimens.
 * Explicit image dimensions remain inline, above this ordinary stylesheet rule.
 * Type and block properties come from the canonical role and block resolvers.
 */
export function referenceWebsitePresentationCss(scope: string): string {
  return `${scope} .studio-block-preview>.content-block{border-width:0}` +
    `${scope} .heading-field{padding-bottom:0}` +
    `${scope} .site-block-style-code :is(.code-editor-shell,.code-highlight,.code-input,.studio-code-preview){border-radius:inherit}` +
    `${scope} .image-field img{width:100%;height:auto}` +
    `${scope} .paragraph-field a:hover:not(.site-block-authored-text-decoration *){text-decoration:none}` +
    `${scope} .divider-field .content-divider.is-wide{border-top-width:1px;border-color:color-mix(in srgb,currentColor 20%,transparent)}`;
}
