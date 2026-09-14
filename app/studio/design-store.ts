import { compactDesignAssets, DESIGN_STORAGE_KEY, migrateDesignProject, validateDesignProject, type DesignProject } from "./design-model";
import { studioWriteOwnership } from "./write-ownership";

export function loadDesigns() {
  const raw = window.localStorage.getItem(DESIGN_STORAGE_KEY);
  if (raw === null) return [];
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Saved designs could not be read. Export a backup before continuing."); }
  if (!Array.isArray(value)) throw new Error("Saved designs have an unsupported format.");
  return value.map(migrateDesignProject);
}

export async function saveDesigns(designs: DesignProject[]) {
  return studioWriteOwnership.write(async () => {
    designs.forEach(validateDesignProject);
    window.localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(designs.map(compactDesignAssets)));
  });
}

export async function saveDesign(design: DesignProject) {
  const designs = loadDesigns();
  const index = designs.findIndex((item) => item.id === design.id);
  if (index === -1) designs.push(design);
  else designs[index] = design;
  await saveDesigns(designs);
}

export async function deleteDesign(id: string) {
  await saveDesigns(loadDesigns().filter((design) => design.id !== id));
}
