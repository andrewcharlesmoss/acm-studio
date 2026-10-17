"use client";

import { useState } from "react";
import { StyleGuideSandbox } from "./style-guide-sandbox";
import { WebsiteLayoutPreview } from "./website-layout-preview";
import "./website-layout-preview.css";

export function StylesWorkspace() {
  const [section, setSection] = useState<"defaults" | "website">("defaults");
  return <div className="styles-workspace">
    <nav className="website-style-navigation" aria-label="Styles Scope">
      <button type="button" aria-pressed={section === "defaults"} onClick={() => setSection("defaults")}>ACM Defaults</button>
      <button type="button" aria-pressed={section === "website"} onClick={() => setSection("website")}>Website Styles</button>
    </nav>
    <div hidden={section !== "defaults"}><StyleGuideSandbox active={section === "defaults"} /></div>
    <div hidden={section !== "website"}><WebsiteLayoutPreview /></div>
  </div>;
}
