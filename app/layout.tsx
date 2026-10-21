import { responsiveBlockCss } from "./content/responsive-styles";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { interfaceStylePresetToCssVariables, universalStylePresetToCssVariables } from "@acm/styles";
import { INTERFACE_STYLE_PRESET, UNIVERSAL_STYLE_PRESET } from "./studio/ui/styles/canonical-style-guide";
import { SharedStyleRuntime } from "@/app/studio/ui/styles/shared-style-runtime";
import "katex/dist/katex.min.css";
import "./globals.css";
import "@acm/styles/styles.css";
import "./studio/studio.css";
import "./studio/media.css";
import "./studio/backup.css";
import "./studio/responsive.css";
import "./studio/site-draft.css";
import "./studio/design.css";
import "./studio/templates.css";
import "./studio/content-slot-layout.css";
import "./content/group-layout.css";
import "./content/buttons.css";
import "./content/featured-image.css";
import "./studio/studio-app-header.css";

export const metadata: Metadata = {
  title: {
    default: "Andrew Charles Moss",
    template: "%s — Andrew Charles Moss",
  },
  description: "Projects, experiments and useful writing by Andrew Charles Moss.",
};

const universalStyleTokens = universalStylePresetToCssVariables(UNIVERSAL_STYLE_PRESET) as Record<string, string>;
const interfaceStyleTokens = interfaceStylePresetToCssVariables(INTERFACE_STYLE_PRESET) as Record<string, string>;
const universalStyleVariables = {
  ...universalStyleTokens,
  ...interfaceStyleTokens,
  "--studio-workspace-background": interfaceStyleTokens["--acm-ui-color-workspace-background"],
  "--studio-pane-surface": interfaceStyleTokens["--acm-ui-color-surface"],
  "--studio-pane-border": interfaceStyleTokens["--acm-ui-color-border"],
  "--studio-selection-colour": interfaceStyleTokens["--acm-ui-color-selection"],
  "--studio-range-accent": interfaceStyleTokens["--acm-ui-color-control-accent"],
  "--studio-range-hover-accent": interfaceStyleTokens["--acm-ui-color-control-hover"],
  "--studio-range-pressed-accent": interfaceStyleTokens["--acm-ui-color-control-pressed"],
  "--studio-shared-button-background": interfaceStyleTokens["--acm-ui-button-base-background"],
  "--studio-shared-button-foreground": interfaceStyleTokens["--acm-ui-button-base-foreground"],
  "--studio-shared-button-border": interfaceStyleTokens["--acm-ui-button-base-border"],
  "--studio-shared-button-hover-background": interfaceStyleTokens["--acm-ui-button-base-hover-background"],
  "--studio-shared-button-hover-foreground": interfaceStyleTokens["--acm-ui-button-base-hover-foreground"],
} as CSSProperties;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body style={universalStyleVariables}><style>{responsiveBlockCss}</style><SharedStyleRuntime />{children}</body>
    </html>
  );
}
