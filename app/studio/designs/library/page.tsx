import type { Metadata } from "next";
import { DesignLibrary } from "../../design-library";

export const metadata: Metadata = {
  title: "All designs",
  description: "Open saved ACM Studio designs.",
};

export default function DesignLibraryPage() {
  return <DesignLibrary />;
}
