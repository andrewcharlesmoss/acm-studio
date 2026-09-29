import type { Metadata } from "next";
import { ControlsCatalogue } from "./controls-catalogue";
import "../catalogue-navigation.css";
import "./catalogue.css";

export const metadata: Metadata = { title: "Controls · Studio UI Library", description: "Explore shared controls used by the ACM Studio inspector." };

export default function StudioUiControlsPage() { return <ControlsCatalogue />; }
