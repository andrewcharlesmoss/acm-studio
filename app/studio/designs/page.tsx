import type { Metadata } from "next";
import { DesignEditor } from "../design-editor";

export const metadata: Metadata = {
  title: "Design Canvas",
  description: "Create and annotate images in ACM Studio.",
};

export default function DesignCanvasPage() {
  return <DesignEditor />;
}
