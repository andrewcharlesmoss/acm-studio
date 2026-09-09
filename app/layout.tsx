import type { Metadata } from "next";
import "./globals.css";
import "./studio/studio.css";
import "./studio/media.css";
import "./studio/backup.css";
import "./studio/responsive.css";
import "./studio/site-draft.css";

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
