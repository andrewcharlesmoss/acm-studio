import { iconGeometry, iconMetadata } from "@acm/icons";

/**
 * @param {string} value
 */
function escapeXml(value) {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]);
}

/**
 * Build a portable SVG with an explicit foreground colour and the chosen
 * optical variant. The standalone artwork stays transparent around the glyph.
 * @param {import("@acm/icons").IconName} name
 * @param {import("@acm/icons").IconScale} scale
 * @param {number} size
 */
export function createIconSvg(name, scale, size) {
  const glyph = iconGeometry[name]?.[scale];
  const metadata = iconMetadata[name];
  if (!glyph || !metadata || !Number.isInteger(size) || size < 1 || size > 512) {
    throw new Error("Choose a valid ACM icon and pixel size.");
  }

  const paths = glyph.paths.map(({ d, fill, stroke }) => {
    const attributes = [`d="${d}"`];
    if (fill) attributes.push('fill="#1C1C1E"');
    if (stroke === "none") attributes.push('stroke="none"');
    return `  <path ${attributes.join(" ")} />`;
  });

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#1C1C1E" stroke-width="${glyph.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">`,
    `  <title>${escapeXml(metadata.label)}</title>`,
    `  <desc>${escapeXml(metadata.description)}</desc>`,
    ...paths,
    `</svg>`,
    "",
  ].join("\n");
}

/**
 * Render SVG artwork into a transparent, three-times PNG.
 * @param {string} svg
 * @param {number} size
 */
export async function createIconPng(svg, size) {
  if (!Number.isInteger(size) || size < 1 || size > 512) {
    throw new Error("Choose a valid PNG pixel size.");
  }

  const sourceUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = size * 3;
    canvas.height = size * 3;
    try {
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The PNG image could not be prepared.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      return await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The PNG image could not be created.")), "image/png");
      });
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

/**
 * Start a local browser download and release its temporary URL afterwards.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadIconFile(blob, filename) {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}
