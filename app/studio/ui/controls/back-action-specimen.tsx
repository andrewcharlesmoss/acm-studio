"use client";

import { useState } from "react";
import { BackAction } from "../../controls/back-action";
import { StudioButton } from "../../controls/button";

/** Temporary destinations exercise both native variants without leaving the catalogue. */
export function BackActionSpecimen() {
  const [page, setPage] = useState("Design");
  const [notice, setNotice] = useState("No back action used.");
  return <div className="ui-control-live" style={{ width: "100%", maxWidth: "220px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <BackAction label="Back to example overview" onClick={() => { setPage("Overview"); setNotice("Button returned to the example overview."); }} />
      <strong>{page}</strong>
    </div>
    <p>Try the shared back action with temporary example destinations.</p>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <BackAction href="#back-action" label="Back using an example link" onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); setPage("Overview"); setNotice("Link returned to the example overview."); }} />
      <span>Link destination</span>
      <BackAction label="Unavailable back action" disabled />
    </div>
    <StudioButton variant="text" onClick={() => { setPage("Design"); setNotice("Example detail opened."); }}>Open Example Detail</StudioButton>
    <p role="status">{notice}</p>
  </div>;
}
