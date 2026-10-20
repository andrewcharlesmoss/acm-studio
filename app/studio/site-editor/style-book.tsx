"use client";

import { BlockRenderer } from "../../components/content";
import { previewStyleDetails, type StyleSelection } from "./styles-preview-state";
import type { TypographyRole } from "./typography-preview-model";
import { styleBookExamples, styleBookExampleText, styleBookPresentation, type StyleBookContext } from "./style-book-model";
import "./style-book.css";

/** Read-only specimen content; navigation and the existing Styles history stay with the owner. */
export function StyleBook({ selection, context, onTypography, onBrowse, onColours }: {
  selection: StyleSelection;
  context: StyleBookContext;
  onTypography: (role?: TypographyRole) => void;
  onBrowse: () => void;
  onColours?: () => void;
}) {
  const { palette } = previewStyleDetails(selection);
  return <div className="site-style-book" style={styleBookPresentation(selection)} aria-label="Style Book examples">
    {styleBookExamples(context).map(example => {
      const open = example.id === "colours" ? onColours ?? onBrowse : example.id === "typography" ? () => onTypography() : example.role ? () => onTypography(example.role) : undefined;
      const label = example.id === "colours" ? onColours ? "Edit palette" : "Browse Colour Variations" : example.id === "typography" ? "Open Typography" : `Open ${example.role === "text" ? "Text" : example.role === "captions" ? "Captions" : example.label} Typography`;
      return <section className={`site-style-book-example is-${example.id}`} key={example.id} aria-labelledby={`style-book-label-${example.id}`}>
        <h2 id={`style-book-label-${example.id}`} className="site-style-book-label">{example.label}</h2>
        <div id={`style-book-sample-${example.id}`} className="site-style-book-sample" inert>
          {example.id === "colours" ? <div className="site-style-book-colours">{palette.colours.map((colour, index) => <span key={index} style={{ background: colour }} title={colour} />)}</div>
          : example.id === "typography" ? <><p className="site-style-book-alphabet">AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789(!…),.;:-&lt;&gt;?!*&amp;:/@HELLO™©</p><div className="site-style-book-columns">{(example.blocks ?? []).map(block => <BlockRenderer key={block.id} variant="studio" blocks={[block]} />)}</div></>
          : example.id === "search" ? <div className="site-style-book-search"><label htmlFor="style-book-search-input">Search</label><div className="site-style-book-search-row"><input id="style-book-search-input" type="search" placeholder="Optional placeholder…" readOnly /><BlockRenderer variant="studio" blocks={example.blocks ?? []} /></div></div>
          : <BlockRenderer variant="studio" blocks={example.blocks ?? []} />}
        </div>
        <p className="visually-hidden" id={`style-book-description-${example.id}`}>{example.id === "colours" ? palette.colours.join(", ") : styleBookExampleText(example)}</p>
        {open ? <button type="button" className="site-style-book-target" aria-label={label} aria-describedby={`style-book-description-${example.id}`} onClick={open} /> : null}
      </section>;
    })}
  </div>;
}
