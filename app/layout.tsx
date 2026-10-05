import type { Metadata } from "next";
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
import "./content/buttons.css";
import "./content/featured-image.css";

export const metadata: Metadata = {
  title: {
    default: "Andrew Charles Moss",
    template: "%s — Andrew Charles Moss",
  },
  description: "Projects, experiments and useful writing by Andrew Charles Moss.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
