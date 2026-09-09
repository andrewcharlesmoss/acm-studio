import { MiniGolfSiteEditor } from "../../mini-golf-site-editor";
import { miniGolfStagingSite } from "../../site-registry";

export const metadata = { title: "Mini Golf Scorecard Staging — Site editor" };

export default function MiniGolfStagingPage() {
  return <MiniGolfSiteEditor site={miniGolfStagingSite} />;
}
