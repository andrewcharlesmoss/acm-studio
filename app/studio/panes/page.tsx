import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Panes · Studio UI Library", description: "Explore reusable ACM Studio pane structures and examples." };

export default function PaneLibraryPage() { redirect("/studio/ui/panes"); }
