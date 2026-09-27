"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";

const MIN_FIT_SIZE = 13;
const MAX_FIT_SIZE = 120;

export function largestFittingFontSize(fits: (size: number) => boolean) {
  if (fits(MAX_FIT_SIZE)) return { size: MAX_FIT_SIZE, wraps: false };
  if (!fits(MIN_FIT_SIZE)) return { size: MIN_FIT_SIZE, wraps: true };
  let lower = MIN_FIT_SIZE;
  let upper = MAX_FIT_SIZE;
  for (let step = 0; step < 11; step++) {
    const middle = (lower + upper) / 2;
    if (fits(middle)) lower = middle;
    else upper = middle;
  }
  return { size: Math.floor(lower * 10) / 10, wraps: false };
}

export function useFitText(ref: RefObject<HTMLElement | null>, enabled: boolean, fallbackFontSize = "", content?: string) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!enabled) {
      element.style.fontSize = fallbackFontSize;
      element.style.whiteSpace = "";
      element.style.wordBreak = "";
      return;
    }

    let animationFrame = 0;
    let active = true;
    let lastWidth = 0;
    function fit() {
      if (!active || !element) return;
      if (!element.textContent?.trim()) { element.style.fontSize = fallbackFontSize; element.style.whiteSpace = ""; return; }
      if (!element.clientWidth) return;
      element.style.whiteSpace = "pre";
      element.style.wordBreak = "normal";
      const textRange = document.createRange();
      textRange.selectNodeContents(element);
      const { size, wraps } = largestFittingFontSize(candidate => {
        element.style.fontSize = `${candidate}px`;
        const computed = getComputedStyle(element);
        const horizontalInset = parseFloat(computed.paddingLeft) + parseFloat(computed.paddingRight);
        const availableWidth = Math.max(0, element.clientWidth - horizontalInset);
        return textRange.getBoundingClientRect().width <= availableWidth;
      });
      element.style.fontSize = `${size}px`;
      if (wraps) {
        element.style.whiteSpace = "pre-wrap";
        element.style.wordBreak = "break-word";
      }
    }
    function scheduleFit(force = false) {
      if (!active || !element) return;
      const width = element.clientWidth;
      if (!force && width === lastWidth) return;
      lastWidth = width;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => { animationFrame = 0; fit(); });
    }

    scheduleFit(true);
    const observedElement = element.parentElement ?? element;
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => scheduleFit());
    resizeObserver?.observe(observedElement);
    const mutationObserver = new MutationObserver(() => scheduleFit(true));
    mutationObserver.observe(element, { childList: true, characterData: true, subtree: true });
    void document.fonts?.ready.then(() => scheduleFit(true));
    return () => {
      active = false;
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [ref, enabled, fallbackFontSize, content]);
}

export function FitTextParagraph({ id, className, style, children }: { id?: string; className: string; style?: CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useFitText(ref, true, "", `${className}|${style?.fontFamily}|${style?.fontWeight}|${style?.fontStyle}|${style?.letterSpacing}|${style?.lineHeight}`);
  return <p ref={ref} id={id} className={className} style={style}>{children}</p>;
}
