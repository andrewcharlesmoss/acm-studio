import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { studioControlEntryById } from "../../../controls/library-catalogue";
import "../../catalogue-navigation.css";
import "../catalogue.css";

type ControlPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: ControlPageProps): Promise<Metadata> {
  const { id } = await params;
  const entry = studioControlEntryById[id];
  return entry ? { title: `${entry.title} · Controls · Studio UI Library`, description: entry.purpose } : { title: "Control · Studio UI Library" };
}

export default async function StudioUiControlPage({ params }: ControlPageProps) {
  const { id } = await params;
  const entry = studioControlEntryById[id];
  if (!entry) notFound();
  redirect(`/studio/ui/controls#${encodeURIComponent(entry.id)}`);
}
