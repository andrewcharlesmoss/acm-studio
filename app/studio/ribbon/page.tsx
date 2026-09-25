import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Ribbon · Studio UI Library", description: "Inspect ACM Ribbon components and product examples." };

export default function RibbonLibraryPage() {
  redirect("/studio/ui/ribbon");
}
