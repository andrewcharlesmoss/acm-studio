import type { CSSProperties, ReactNode } from "react";
import type { ContentBlock } from "../../content/model";
import { blockAlignmentClass } from "../../content/block-alignment";

/** Editing supplies fields; read-only rendering supplies text in the same frame. */
export function QuoteContent({ block, studio, children, citation, visualFrame }: {
  block: Extract<ContentBlock, { type: "quote" }>;
  studio: boolean;
  children: ReactNode;
  citation?: ReactNode;
  visualFrame?: { id: string | undefined; className: string; style: CSSProperties };
}) {
  const className = `${studio ? "quote-field" : "pull-quote"} align-${block.align ?? "left"}${blockAlignmentClass(block) ? ` ${blockAlignmentClass(block)}` : ""}${block.quoteStyle === "plain" ? " is-style-plain" : ""}${visualFrame ? ` ${visualFrame.className}` : ""}`;
  return <figure id={visualFrame?.id} className={className} style={visualFrame?.style}>
    <blockquote>{children}</blockquote>
    {citation ? <figcaption className="quote-citation">{citation}</figcaption> : null}
  </figure>;
}
