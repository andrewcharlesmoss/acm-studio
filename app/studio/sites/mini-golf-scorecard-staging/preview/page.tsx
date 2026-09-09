import { MiniGolfStandalonePreview } from "../../../mini-golf-standalone-preview";
import { miniGolfStagingSite } from "../../../site-registry";

export const metadata = { title: "Mini Golf Scorecard Staging — Preview" };

export default function MiniGolfStagingPreviewPage() {
  return <MiniGolfStandalonePreview site={miniGolfStagingSite} />;
}
