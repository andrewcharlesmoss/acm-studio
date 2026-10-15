"use client";

import { useState } from "react";
import { StudioIcon } from "../../studio-icons";
import { ObjectManipulationSpecimen } from "../controls/resize-handles-specimen";

export const objectManipulationPlayground = {
  id: "object-manipulation-playground",
  title: "Object manipulation playground",
  purpose: "Move, resize, and rotate shapes and images together at different zoom levels.",
  owner: "ACM Studio canvas controls",
  consumers: "Designs and Studio UI Library examples",
  dependencies: "DesignObjectArtwork, CanvasHandle, RotationHandle, shared move and resize geometry, resize-drag continuity, rotation geometry, and HistoryActions.",
  href: "/studio/ui/workspace#object-manipulation-playground",
};

export function ObjectManipulationPlayground() {
  const [revision, setRevision] = useState(0);
  return <section id={objectManipulationPlayground.id} className="ui-control-entry ui-workspace-example" aria-labelledby="object-manipulation-playground-title">
    <header className="ui-control-entry-header">
      <div><p className="rl-eyebrow">Workspace example</p><h2 id="object-manipulation-playground-title">{objectManipulationPlayground.title}</h2><p>{objectManipulationPlayground.purpose}</p></div>
      <button className="ui-control-reset" type="button" onClick={() => setRevision(value => value + 1)}><StudioIcon name="rotate" size={18} />Reset example</button>
    </header>
    <div className="ui-control-detail-card">
      <div className="ui-control-detail-header"><h3>Live playground</h3></div>
      <div className="ui-control-detail-example is-wide"><ObjectManipulationSpecimen key={revision} /></div>
      <p className="ui-control-detail-note">Changes stay in this example only. Shape and Image each start with their own temporary history.</p>
    </div>
    <details className="ui-control-facts"><summary><span>Ownership, consumers, dependencies and compatibility</span><StudioIcon name="chevron-right" size={16} /></summary><dl>
      <div><dt>Ownership</dt><dd>{objectManipulationPlayground.owner}</dd></div>
      <div><dt>Consumers</dt><dd>{objectManipulationPlayground.consumers}</dd></div>
      <div><dt>Dependencies</dt><dd>{objectManipulationPlayground.dependencies}</dd></div>
      <div><dt>Supported states</dt><dd>Shape, image, moving, proportional resize, Shift stretching, Alt centre resizing, rotation, zoom, keyboard, read-only, Escape cancellation, Undo/Redo, and Reset.</dd></div>
      <div><dt>Compatibility</dt><dd>Movement is free within the example’s expanding canvas. Designs retains its own snapping and page constraints. <a href="/studio/ui/controls#resize-handles">Resize handles</a> and <a href="/studio/ui/controls#rotation-handle">Rotation handle</a> remain available as focused examples.</dd></div>
    </dl></details>
  </section>;
}
