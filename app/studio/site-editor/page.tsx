import { SiteEditorPreview } from "./site-editor-preview";
import { ProjectLocalLinksProvider } from "../project-local-links";
export const metadata = { title: "Site Editor Preview — ACM Studio" };
export default function SiteEditorPage() { return <ProjectLocalLinksProvider><SiteEditorPreview /></ProjectLocalLinksProvider>; }
