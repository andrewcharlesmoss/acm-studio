import { useId } from "react";
import type { DesignAsset, DesignObject, DesignPage } from "./design-model";
import { arrowGeometry, arrowLineStyle, polygonPoints, shapeKindFor } from "./design-geometry";
import { createDesignTextMeasurer, layoutDesignText } from "./design-text";

/** Intrinsic artwork only. Canvas hit targets, selection and editing stay outside. */
export function DesignObjectArtwork({ object, assets }: { object: DesignObject; assets: DesignAsset[] }) {
  const clipId = `design-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (object.type === "image") {
    const asset = assets.find(item => item.id === object.assetId);
    if (!asset) return null;
    const crop = object.crop ?? { x: 0, y: 0, width: 1, height: 1 };
    return <><defs><clipPath id={clipId}><rect width={object.width} height={object.height} /></clipPath></defs><image href={asset.dataUrl} x={-crop.x / crop.width * object.width} y={-crop.y / crop.height * object.height} width={object.width / crop.width} height={object.height / crop.height} preserveAspectRatio="none" clipPath={`url(#${clipId})`} /></>;
  }
  if (object.type === "arrow") {
    const geometry = arrowGeometry(object);
    const dotted = arrowLineStyle(object) === "dotted";
    const lineCap = dotted ? "round" : object.startArrowhead === true || object.arrowhead ? "butt" : "round";
    return <><path d={geometry.path} fill="none" stroke={object.stroke} strokeOpacity={object.strokeOpacity ?? 1} strokeWidth={object.strokeWidth} strokeLinecap={lineCap} strokeDasharray={dotted ? `${Math.max(1, object.strokeWidth)} ${Math.max(2, object.strokeWidth * 1.8)}` : undefined} />{geometry.startArrowhead ? <polygon points={geometry.startArrowhead} fill={object.stroke} fillOpacity={object.strokeOpacity ?? 1} /> : null}{geometry.endArrowhead ? <polygon points={geometry.endArrowhead} fill={object.stroke} fillOpacity={object.strokeOpacity ?? 1} /> : null}</>;
  }
  if (object.type === "text" || object.type === "step") {
    const anchor = object.align === "center" ? "middle" : object.align === "right" ? "end" : "start";
    const x = object.align === "center" ? object.width / 2 : object.align === "right" ? object.width : 0;
    const lines = layoutDesignText({ ...object, measure: createDesignTextMeasurer(object.fontFamily, object.fontSize, object.fontWeight) });
    return <><defs><clipPath id={clipId}><rect width={object.width} height={object.height} /></clipPath></defs>{object.type === "step" ? <circle cx={object.width / 2} cy={object.height / 2} r={Math.min(object.width, object.height) / 2} fill={object.fill ?? "#cc1818"} fillOpacity={object.fillOpacity ?? 1} /> : null}<text clipPath={`url(#${clipId})`} fill={object.colour} fillOpacity={object.colourOpacity ?? 1} fontFamily={object.fontFamily} fontSize={object.fontSize} fontWeight={object.fontWeight} textAnchor={anchor}>{lines.map((line, index) => <tspan key={index} x={x} y={line.y}>{line.text || "\u00a0"}</tspan>)}</text></>;
  }
  if (!("stroke" in object)) return null;
  const kind = shapeKindFor(object);
  const points = polygonPoints(kind, object.width, object.height);
  const paint = { fill: object.type === "redaction" ? "#000000" : object.fill, fillOpacity: object.fillOpacity ?? 1, stroke: object.stroke, strokeOpacity: object.strokeOpacity ?? 1, strokeWidth: object.strokeWidth };
  return kind === "circle" ? <ellipse cx={object.width / 2} cy={object.height / 2} rx={object.width / 2} ry={object.height / 2} {...paint} /> : points ? <polygon points={points} {...paint} /> : <rect width={object.width} height={object.height} rx={kind === "roundedRectangle" ? Math.max(object.radius ?? 0, Math.min(object.width, object.height) * .16) : object.radius ?? 0} {...paint} />;
}

export function DesignPageBackground({ page, checkerboard = false, interactive = false }: { page: DesignPage; checkerboard?: boolean; interactive?: boolean }) {
  const checkerId = `design-checker-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return <>
    {checkerboard && page.background.kind === "transparent" ? <defs><pattern id={checkerId} width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#f7f6f2" /><rect width="10" height="10" fill="#e9e7df" /><rect x="10" y="10" width="10" height="10" fill="#e9e7df" /></pattern></defs> : null}
    {page.background.kind !== "transparent" || checkerboard ? <rect data-canvas-background={interactive ? "true" : undefined} width={page.width} height={page.height} fill={page.background.kind === "transparent" ? `url(#${checkerId})` : page.background.colour} /> : null}
  </>;
}

/** The same content tree feeds thumbnails and safely serialised raster exports. */
export function DesignPageArtwork({ page, assets, checkerboard = false, className }: { page: DesignPage; assets: DesignAsset[]; checkerboard?: boolean; className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={page.width} height={page.height} viewBox={`0 0 ${page.width} ${page.height}`} className={className} role="img" aria-label={page.name}>
    <DesignPageBackground page={page} checkerboard={checkerboard} />
    {page.objects.map(object => <g key={object.id} transform={`translate(${object.x} ${object.y}) rotate(${object.rotation} ${object.width / 2} ${object.height / 2})`} opacity={object.opacity}><DesignObjectArtwork object={object} assets={assets} /></g>)}
  </svg>;
}
