import type { Metadata } from "next";
import { StudioPrototype } from "./studio-prototype";

export const metadata: Metadata = {
  title: "Studio block editor",
  description: "The local page and post editor for the Andrew Charles Moss publishing foundation.",
};

export default function StudioPage() {
  return <StudioPrototype />;
}
