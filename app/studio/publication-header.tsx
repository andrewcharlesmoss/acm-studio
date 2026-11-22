import type { ComponentProps } from "react";
import type { PublicationHeader } from "./template-model";
import { TemplateNodes, TemplatePartRegion, TemplateSurface } from "./template-renderer";

type HeaderProps = Pick<ComponentProps<typeof TemplateNodes>, "document" | "mediaUrls" | "navigationPageListLinks" | "navigationSearchEntries" | "documentHref">;

export function PublicationHeaderView({ header, ...context }: HeaderProps & { header: PublicationHeader }) {
  const part = header.set.parts.find(item => item.id === header.partId);
  if (!part?.nodes.some(node => !node.editorial?.hidden)) return null;
  return <div className="test-document-navigation"><TemplateSurface set={header.set}><TemplatePartRegion part={part}>
    <TemplateNodes {...context} nodes={part.nodes} set={header.set} />
  </TemplatePartRegion></TemplateSurface></div>;
}
