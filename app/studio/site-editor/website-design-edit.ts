import type { ContentBlock } from "../../content/model";
import { applyTemplatePropertyOverrides, templatePropertyOverrides } from "../global-template-contract";

/** Apply the user's actual edit to canonical content, excluding inherited presentation. */
export function rebaseWebsiteDesignEdit(canonical: ContentBlock, projected: ContentBlock, edited: ContentBlock): ContentBlock {
  return applyTemplatePropertyOverrides(canonical, templatePropertyOverrides(projected, edited));
}
