/** Widths for the shared two-left-pane composition; feature owners retain state. */
export function twoLeftPaneWidths(primary: { width: number; collapsed: boolean }, secondary: { width: number; collapsed: boolean }) {
  return {
    "--two-left-primary-width": `${primary.collapsed ? 0 : primary.width}px`,
    "--two-left-secondary-width": `${secondary.collapsed ? 0 : secondary.width}px`,
    "--two-left-secondary-fluid-width": secondary.collapsed ? "0px" : "1fr",
  };
}
