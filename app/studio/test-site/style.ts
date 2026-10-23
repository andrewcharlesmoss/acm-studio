import { universalStylePresetToCss } from "@acm/styles";
import { UNIVERSAL_STYLE_PRESET } from "../ui/styles/canonical-style-guide";
// The same scoped site stylesheet is installed in editor and standalone output.
export const testSiteCss = universalStylePresetToCss(UNIVERSAL_STYLE_PRESET, ".test-site-page") + `
.test-document-navigation{box-sizing:border-box;min-width:320px;color:var(--ink);background:var(--paper);font-family:var(--font-sans);font-size:1rem;line-height:1.55;font-weight:400}
.test-document-navigation>.template-surface{max-width:none;border-radius:0}
.test-document-navigation .template-header{padding:0;border:0}.test-document-navigation .template-navigation{justify-content:start;gap:16px}
.test-document-navigation .template-navigation a{color:inherit;text-decoration:none;min-height:0;padding:0}.test-document-navigation [aria-current=page]{font-weight:700}
.test-site-page{color:#1c1c1e;background:#f2f2f7;font-family:Inter,"Helvetica Neue",Helvetica,Arial,sans-serif;box-sizing:border-box;min-width:320px;display:flow-root;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
.test-site-page *{box-sizing:border-box}.test-site-page>.studio-block-preview,.test-site-page>.studio-block-preview>.content-block.is-group{display:contents}.test-site-page header,.test-site-page footer{width:min(100% - 48px,1040px);margin-inline:auto}
.test-site-page header{padding-block:28px;border-bottom:1px solid #d1d1d6;font-size:1rem;font-weight:600}
.test-site-page main{display:block;padding:0;text-align:left}
.test-site-page :is(p,.paragraph-field){margin:0;color:inherit}
.test-site-page footer{padding-block:20px;border-top:1px solid #d1d1d6;color:#636366;font-size:.875rem;line-height:1.4}
.test-site-page .align-left{text-align:left}.test-site-page .align-centre{text-align:center}.test-site-page .align-right{text-align:right}.test-site-page .align-justify{text-align:justify}
.test-site-page a:not(.content-button){color:var(--studio-paragraph-link-color,#2f6eb4);text-decoration:underline}.test-site-page a:not(.content-button):hover{color:var(--studio-paragraph-link-hover-color,var(--studio-paragraph-link-color,#1f4f88))}
.test-site-page .content-group.layout-row{display:flex;gap:16px}.test-site-page .content-group.layout-stack{display:flex;flex-direction:column;gap:16px}.test-site-page .content-group.layout-grid{display:grid;gap:16px}
@media(max-width:480px){.test-site-page header,.test-site-page footer{width:min(100% - 32px,1040px)}.test-site-page header{padding-block:22px}.test-site-page footer{padding-block:18px}}
`;
