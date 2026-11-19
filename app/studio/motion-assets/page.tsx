import type { Metadata } from "next";
import { MotionPlayground } from "./motion-playground";

export const metadata: Metadata = {
  title: "Motion Assets",
  description: "Create and export draw-on sketch animations in ACM Studio.",
};

export default function MotionAssetsPage() {
  return <MotionPlayground />;
}
