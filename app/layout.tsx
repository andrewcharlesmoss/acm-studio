import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { UNIVERSAL_STYLE_PRESET, universalStylePresetToCssVariables } from "@acm/styles";
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

export const metadata: Metadata = {
  title: {
    default: "Andrew Charles Moss",
    template: "%s — Andrew Charles Moss",
  },
  description: "Projects, experiments and useful writing by Andrew Charles Moss.",
};

const universalStyleTokens = universalStylePresetToCssVariables(UNIVERSAL_STYLE_PRESET) as Record<string, string>;
const universalStyleVariables = {
  ...universalStyleTokens,
  // Editor controls must keep the shared action colours inside authored style scopes.
  "--studio-shared-button-background": universalStyleTokens["--acm-button-base-background"],
  "--studio-shared-button-foreground": universalStyleTokens["--acm-button-base-foreground"],
  "--studio-shared-button-border": universalStyleTokens["--acm-button-base-border"],
  "--studio-shared-button-hover-background": universalStyleTokens["--acm-button-base-hover-background"],
  "--studio-shared-button-hover-foreground": universalStyleTokens["--acm-button-base-hover-foreground"],
} as CSSProperties;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body style={universalStyleVariables}>{children}</body>
    </html>
  );
}
