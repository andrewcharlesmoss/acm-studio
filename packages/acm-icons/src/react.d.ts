import type { ReactElement } from "react";
import type { IllustrationColours } from "./illustration-colours.js";
import type { SecurityColours } from "./security-colours.js";
import type { AnnotationColours } from "./annotation-colours.js";
import type { IconName, IconScale } from "../dist/index.js";
export type AcmIconProps = {
  name: IconName; scale?: IconScale; size?: number | string;
  className?: string; label?: string; appearance?: "outline" | "filled";
} & (
  | { variant: "illustration"; illustrationColours: IllustrationColours; securityColours?: never; featureColour?: never; annotationColours?: never; statusColour?: never; mediaColour?: never }
  | { variant: "security"; securityColours: SecurityColours; featureColour?: never; annotationColours?: never; statusColour?: never; mediaColour?: never }
  | { variant: "feature"; featureColour: string; annotationColours?: never; statusColour?: never; mediaColour?: never }
  | { variant: "annotation"; annotationColours: AnnotationColours; statusColour?: never; mediaColour?: never }
  | { variant: "status"; statusColour: string; mediaColour?: never }
  | { variant: "media"; mediaColour: string; statusColour?: never }
  | { variant?: "default" | "brand"; statusColour?: never; mediaColour?: never }
);
export declare function AcmIcon(props: AcmIconProps): ReactElement;
