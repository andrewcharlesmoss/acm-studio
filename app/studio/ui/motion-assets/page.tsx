import type { Metadata } from "next";
import { MotionPlayground } from "../../motion-assets/motion-playground";
import { StudioUiSectionHost } from "../studio-ui-section-host";

export const metadata: Metadata = {
  title: "Motion Assets · Studio UI Library",
  description: "Create and export draw-on sketch animations in ACM Studio.",
};

export default function StudioUiMotionAssetsPage() {
  return <StudioUiSectionHost section="motion-assets"><MotionPlayground /></StudioUiSectionHost>;
}
