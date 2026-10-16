export const templatePartCanvasViews = ["full", "fit"];
export const templatePartViewChangedEvent = "acm-studio-template-part-view-saved-v1";
export const templatePartViewKeys = {
  header: "acm-studio-template-header-canvas-view-v1",
  footer: "acm-studio-template-footer-canvas-view-v1",
};
export const validTemplatePartCanvasView = value => templatePartCanvasViews.includes(value);
