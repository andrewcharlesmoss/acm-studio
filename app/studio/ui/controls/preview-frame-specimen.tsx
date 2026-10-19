"use client";

import { ResizablePreviewFrame } from "../../controls/resizable-preview-frame";
import "./preview-frame-specimen.css";

/** Isolated sample content; the production frame owns all resizing and handle states. */
export function PreviewFrameSpecimen() {
  return <div className="ui-preview-frame-specimen" role="group" aria-label="Resizable preview example">
    <ResizablePreviewFrame>
      <article className="ui-preview-frame-page">
        <h2>A place for ideas</h2>
        <p>Stories, notes, and projects take shape in the space around them.</p>
        <div className="ui-preview-frame-cards">
          <section><h3>Stories</h3><p>Every story begins with a little curiosity. Follow a detail, explore a question, and see where it leads.</p></section>
          <section><h3>Notes</h3><p>Small observations can open up a different way of looking at familiar things.</p></section>
          <section><h3>Projects</h3><p>Give an idea room to grow. Try something, consider the result, and keep refining it.</p></section>
        </div>
      </article>
    </ResizablePreviewFrame>
  </div>;
}
