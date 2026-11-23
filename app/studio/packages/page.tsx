import type { Metadata } from "next";
import { PackageDashboard } from "./package-dashboard";

export const metadata: Metadata = { title: "Packages · ACM Studio" };

export default function PackagesPage() {
  return <PackageDashboard />;
}
