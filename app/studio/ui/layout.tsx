import type { ReactNode } from "react";
import { MotionPreviewWorkspaceProvider } from "../motion-assets/motion-preview-workspace";

export default function StudioUiLayout({ children }: { children: ReactNode }) {
  return <MotionPreviewWorkspaceProvider>{children}</MotionPreviewWorkspaceProvider>;
}
