import { UNIVERSAL_STYLE_PRESET, universalStylePresetToCss } from "@acm/styles";
// The same scoped site stylesheet is installed in editor and standalone output.
export const testSiteCss = universalStylePresetToCss(UNIVERSAL_STYLE_PRESET, ".test-site-page") + `
.test-site-page{color:#1c1c1e;background:#f2f2f7;font-family:Inter,"Helvetica Neue",Helvetica,Arial,sans-serif;box-sizing:border-box;min-width:320px;min-height:100svh;display:grid;grid-template-rows:auto 1fr auto;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
.test-site-page *{box-sizing:border-box}.test-site-page>.studio-block-preview,.test-site-page>.studio-block-preview>.content-block.is-group{display:contents}.test-site-page header,.test-site-page footer{width:min(100% - 48px,1040px);margin-inline:auto}
.test-site-page header{padding-block:28px;border-bottom:1px solid #d1d1d6;font-size:1rem;font-weight:600}
.test-site-page main{display:grid;align-content:center;padding:64px 24px;text-align:center;gap:16px}
.test-site-page :is(p,.paragraph-field){margin:0;font-size:inherit;font-weight:inherit;letter-spacing:inherit;color:inherit;line-height:1.35}.test-site-page header :is(p,.paragraph-field){font-size:1rem;font-weight:600}.test-site-page main :is(p,.paragraph-field){font-size:clamp(1.25rem,4vw,2rem);font-weight:500;letter-spacing:-.025em}.test-site-page footer :is(p,.paragraph-field){font-size:.875rem;font-weight:400;line-height:1.4}
.test-site-page footer{padding-block:20px;border-top:1px solid #d1d1d6;color:#636366;font-size:.875rem;line-height:1.4}
.test-site-page .align-left{text-align:left}.test-site-page .align-centre{text-align:center}.test-site-page .align-right{text-align:right}.test-site-page .align-justify{text-align:justify}
.test-site-page a{color:var(--studio-paragraph-link-color,#2f6eb4);text-decoration:underline}.test-site-page a:hover{color:var(--studio-paragraph-link-hover-color,var(--studio-paragraph-link-color,#1f4f88))}
.test-site-page h1{font-size:2rem}.test-site-page h2{font-size:1.75rem}.test-site-page h3{font-size:1.5rem}.test-site-page h4{font-size:1.375rem}.test-site-page h5{font-size:1.25rem}.test-site-page h6{font-size:1.125rem}.test-site-page :is(h1,h2,h3,h4,h5,h6,.heading-field){margin:0;line-height:1.2;font-weight:700;color:inherit}
.test-site-page .content-group.layout-row{display:flex;gap:16px}.test-site-page .content-group.layout-stack{display:flex;flex-direction:column;gap:16px}.test-site-page .content-group.layout-grid{display:grid;gap:16px}
@media(max-width:480px){.test-site-page header,.test-site-page footer{width:min(100% - 32px,1040px)}.test-site-page header{padding-block:22px}.test-site-page main{padding:48px 16px}.test-site-page footer{padding-block:18px}}
`;
