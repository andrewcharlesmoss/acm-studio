import type { Metadata } from "next";
import { StudioDashboard } from "./studio/studio-dashboard";
export const metadata: Metadata = {
  title: "ACM Studio",
  description: "The control centre for Andrew Moss sites, projects and publishing.",
};

export default function Home() {
  return <StudioDashboard />;
}
