import type { Metadata } from "next";
import { TemplateWorkspace } from "../template-workspace";
export const metadata: Metadata = { title: "Templates", description: "Create reusable page and post designs in ACM Studio." };
export default function TemplatesPage() { return <TemplateWorkspace />; }
