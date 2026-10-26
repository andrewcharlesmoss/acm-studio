import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHostModuleEvaluator, loadProductionModule } from "./production-module.mjs";

const identity = await loadProductionModule(new URL("../app/studio/site-editor/identity-preview-state.ts", import.meta.url));
const styles = await loadProductionModule(new URL("../app/studio/site-editor/styles-preview-state.ts", import.meta.url));
const colours = await loadProductionModule(new URL("../app/studio/site-editor/colours-preview-model.ts", import.meta.url));
const layout = await loadProductionModule(new URL("../app/studio/site-editor/layout-preview-model.ts", import.meta.url));
const background = await loadProductionModule(new URL("../app/studio/site-editor/background-preview-model.ts", import.meta.url));
const typography = await loadProductionModule(new URL("../app/studio/site-editor/typography-preview-model.ts", import.meta.url));
const guide = await loadProductionModule(new URL("../app/studio/ui/styles/canonical-style-guide.ts", import.meta.url));

test("Site Editor enables Reset styles only when the scoped edit can be applied", async () => {
  const slots = []; let index = 0; let ready = false; let failure = null; let recoverable = false;
  let styleHistory = styles.createStylesPreview();
  styleHistory = styles.stylesPreviewReducer(styleHistory, { type: "block-style", scope: "global", block: "image", patch: { borderWidth: "65px" } });
  styleHistory = styles.stylesPreviewReducer(styleHistory, { type: "block-style", scope: "test", block: "image", patch: { borderWidth: "12px" } });
  const dispatchStyle = action => { if (ready && (!failure || recoverable && action.type === "reset")) styleHistory = styles.stylesPreviewReducer(styleHistory, action); };
  const react = {
    useState(initial) { const id = index++; if (!(id in slots)) slots[id] = initial === "test" ? "global" : initial; return [slots[id], value => { slots[id] = typeof value === "function" ? value(slots[id]) : value; }]; },
    useRef: initial => ({ current: initial }), useCallback: fn => fn, useMemo: fn => fn(), useLayoutEffect() {}, useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const require = name => name === "react" ? react : name === "react/jsx-runtime" ? { jsx, jsxs: jsx }
    : name.endsWith("use-site-editor-sessions") ? { useSiteEditorSessions: () => ({ test: {}, test2: {}, browser: {}, globals: {} }) }
    : name.endsWith("use-test-site-context") ? { useTestSiteContext: () => ({ session: {}, templates: {} }) }
    : name.endsWith("project-local-links") ? { useProjectLocalVisit: () => ({ openLocal() {} }), ProjectLocalDocumentButton: "ProjectLocalDocumentButton" }
    : name.endsWith("studio-view-menu") ? { viewportWidthFor: () => undefined }
    : name.endsWith("use-website-design") ? { useWebsiteDesign: () => ({ history: identity.createIdentityPreview(), dispatch() {}, stylesHistory: styleHistory, dispatchStyle, ready, failure, canResetAfterValidationFailure: recoverable, status: "", startup: null, flush: async () => {} }) }
    : name.endsWith("identity-preview-state") ? identity : name.endsWith("styles-preview-state") ? styles
    : name.endsWith("canonical-style-guide") ? guide : name.endsWith("layout-preview-model") ? layout
    : name.endsWith("background-preview-model") ? background : name.endsWith("colours-preview-model") ? colours
    : name.endsWith("typography-preview-model") ? typography : name.endsWith("use-blob-urls") ? { useBlobUrls: () => ({}) }
    : name.endsWith("native-fields") ? { TextInput: "input", SelectControl: "select" }
    : name.endsWith(".css") ? {} : new Proxy({}, { get: (_, key) => key });
  const source = readFileSync(new URL("../app/studio/site-editor/site-editor-preview.tsx", import.meta.url), "utf8");
  const component = createHostModuleEvaluator(["require", "exports", "requestAnimationFrame"], `${source}\nreturn exports.SiteEditorPreview;`)(require, {}, callback => callback());
  const all = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children), ...all(node.props?.primary), ...all(node.props?.secondary), ...all(node.props?.header)];
  const render = () => { index = 0; return component(); };
  let tree = render();
  all(tree).find(node => node.type === "button" && node.props.children?.some?.(child => child?.type === "strong" && child.props.children === "Styles")).props.onClick();
  await new Promise(resolve => setImmediate(resolve)); tree = render();
  const header = () => all(tree).find(node => node.type === "StylesPaneHeaderActions").props;
  assert.equal(header().canReset, false, "loading settings cannot accept a reset");
  ready = true; tree = render();
  assert.equal(header().canReset, true, "loaded styles can be reset");
  failure = "Save failed"; tree = render();
  assert.equal(header().canReset, false, "a failed save cannot accept a reset");
  failure = "Unsupported website style setting. Your draft was preserved."; recoverable = true; tree = render();
  assert.equal(header().canReset, true, "a validation-failed draft can be reset without a reload");
  header().onReset(); tree = render();
  assert.equal(styleHistory.present.global.blockStyles, undefined);
  assert.equal(styleHistory.present.test.blockStyles.image.borderWidth, "12px");
  failure = null; recoverable = false; dispatchStyle({ type: "undo" });
  assert.equal(styleHistory.present.global.blockStyles.image.borderWidth, "65px");
});
