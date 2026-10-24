import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { studioControlEntryById } from "../../../controls/library-catalogue";
import "../catalogue.css";

type ControlPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: ControlPageProps): Promise<Metadata> {
  const { id } = await params;
  if (id === "block-appender") return { title: "Block editor playground · Workspace · Studio UI Library" };
  const entry = studioControlEntryById[id];
  return entry ? { title: `${entry.title} · Controls · Studio UI Library`, description: entry.purpose } : { title: "Control · Studio UI Library" };
}

export default async function StudioUiControlPage({ params }: ControlPageProps) {
  const { id } = await params;
  if (id === "block-appender") redirect("/studio/ui/workspace#block-editor-playground");
  const entry = studioControlEntryById[id];
  if (!entry) notFound();
  redirect(`/studio/ui/controls#${encodeURIComponent(entry.id)}`);
}
