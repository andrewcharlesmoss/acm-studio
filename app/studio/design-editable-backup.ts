import { compactDesignAssets, migrateDesignProject, type DesignProject } from "./design-model.ts";
import { validateDesignImportFileSize, validateDesignImportResources } from "./design-import-limits.mjs";

const utf8 = new TextEncoder();

export function readEditableDesign(source: string) {
  validateDesignImportFileSize(utf8.encode(source).byteLength);
  const raw: unknown = JSON.parse(source);
  validateDesignImportResources(raw);
  return migrateDesignProject(raw);
}

function editableFile(design: DesignProject) {
  const source = JSON.stringify(design);
  readEditableDesign(source);
  return utf8.encode(source);
}

export type DesignBackupFile = { name: string; data: Uint8Array };
export function prepareEditableDesignBackup(design: DesignProject) {
  try {
    return { kind: "editable" as const, data: editableFile(design) };
  } catch {
    // Keep the exact source, even if an old or disconnected draft exceeds import limits.
    const source = utf8.encode(JSON.stringify(design));
    const files: DesignBackupFile[] = [{ name: "complete-source.json", data: source }];
    const externalImages = new Set<string>();
    // Sections may share a large source image. Bound copies in the archive as well
    // as the size of each import; the complete source always contains every layer.
    let sectionBytesRemaining = 2 * source.byteLength + 8_000_000;
    let unavailable = 0;
    function writeSection(pages: DesignProject["pages"], label: string) {
      const section = compactDesignAssets({
        ...design, pages, activePageId: pages.some(page => page.id === design.activePageId) ? design.activePageId : pages[0].id,
      });
      if (sectionBytesRemaining > 0 && files.length < 8192) {
        try {
          const data = editableFile(section);
          if (data.byteLength <= sectionBytesRemaining) {
            files.push({ name: `section-${label}.acm-design.json`, data });
            sectionBytesRemaining -= data.byteLength;
            return;
          }
        } catch {
          // Split bounded imports below. Keep any indivisible layer in the source.
        }
        if (pages.length > 1) {
          const middle = Math.floor(pages.length / 2);
          writeSection(pages.slice(0, middle), label + "a");
          writeSection(pages.slice(middle), label + "b");
          return;
        }
        const [page] = pages;
        if (page.objects.length > 1) {
          const middle = Math.floor(page.objects.length / 2);
          writeSection([{ ...page, objects: page.objects.slice(0, middle) }], label + "a");
          writeSection([{ ...page, objects: page.objects.slice(middle) }], label + "b");
          return;
        }
      }
      unavailable++;
      for (const asset of section.assets) externalImages.add(asset.id);
    }
    if (design.pages.length) writeSection(design.pages, "1");
    const imageIndex: Array<{ id: string; originalName: string; file: string }> = [];
    for (const asset of design.assets) {
      if (!externalImages.has(asset.id)) continue;
      const name = `image-${imageIndex.length + 1}.${asset.type.split("/")[1]}`;
      try {
        const data = Uint8Array.from(atob(asset.dataUrl.slice(asset.dataUrl.indexOf(",") + 1)), character => character.charCodeAt(0));
        files.push({ name, data });
        imageIndex.push({ id: asset.id, originalName: asset.name, file: name });
      } catch { /* Preserve unreadable legacy data verbatim in the complete source. */ }
    }
    if (imageIndex.length) files.push({ name: "image-index.json", data: utf8.encode(JSON.stringify(imageIndex, null, 2)) });
    return { kind: "archive" as const, files, unavailable };
  }
}
