import { MiniGolfStandalonePreview } from "../../../mini-golf-standalone-preview";
import { miniGolfSite } from "../../../site-registry";

export const metadata = { title: "Mini Golf Scorecard — Preview" };

export default function MiniGolfPreviewPage() {
  return <MiniGolfStandalonePreview site={miniGolfSite} />;
}
