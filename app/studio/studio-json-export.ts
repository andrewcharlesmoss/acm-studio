/** Browser-only JSON download; the caller owns the data and filename. */
export function exportStudioJson(value: unknown, filename: string, revokeDelay = 0) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  try { link.click(); }
  finally {
    if (revokeDelay) setTimeout(() => URL.revokeObjectURL(url), revokeDelay);
    else URL.revokeObjectURL(url);
  }
}
