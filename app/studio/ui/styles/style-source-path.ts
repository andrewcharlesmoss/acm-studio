/** Both style editors use the nearest mapped setting or specimen. */
export function styleSourcePathFromTarget(target: EventTarget | null): string | null {
  return target instanceof Element ? target.closest<HTMLElement>("[data-style-path]")?.dataset.stylePath ?? null : null;
}
