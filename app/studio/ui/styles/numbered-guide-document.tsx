"use client";

import { forwardRef, useLayoutEffect, useRef, useState, type HTMLAttributes, type UIEvent } from "react";

/** One horizontal scroll surface with an independent, vertically aligned gutter. */
export const NumberedGuideDocument = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function NumberedGuideDocument({ children, onKeyDown, ...props }, ref) {
  const horizontalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const scrollbarContentRef = useRef<HTMLDivElement>(null);
  const [labels, setLabels] = useState<{ line: number; top: number }[]>([]);
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () => {
      if (scrollbarContentRef.current) scrollbarContentRef.current.style.width = `${content.scrollWidth}px`;
      const origin = content.getBoundingClientRect().top;
      const next = [...content.querySelectorAll<HTMLElement>('[id^="sg-guide-formatted-line-"], [data-source-line]')].map(row => {
        const target = row.querySelector<HTMLElement>(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6, :scope > .sg-formatted-source-line, :scope > td:not(.sg-formatted-line-number-cell), :scope > th:not(.sg-formatted-line-number-cell), :scope > .canonical-source-text') ?? row;
        const style = getComputedStyle(target);
        const rect = target.getBoundingClientRect();
        const height = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
        const firstLineHeight = Math.min(height, rect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
        return { line: Number(row.dataset.sourceLine ?? row.id.split('-').at(-1)), top: rect.top - origin + parseFloat(style.paddingTop) + firstLineHeight / 2 };
      });
      setLabels(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    for (const child of content.children) observer.observe(child);
    return () => observer.disconnect();
  }, [children]);
  function syncHorizontalScroll(event: UIEvent<HTMLDivElement>, target: HTMLDivElement | null) {
    if (target && Math.abs(target.scrollLeft - event.currentTarget.scrollLeft) > 1) target.scrollLeft = event.currentTarget.scrollLeft;
  }
  // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Owners supply a labelled, keyboard-focusable scroll region through props.
  return <div {...props} ref={ref} onKeyDown={event => {
    onKeyDown?.(event);
    // The labelled outer region owns keyboard scrolling; leave links and source actions alone.
    if (event.defaultPrevented || event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      horizontalRef.current?.scrollBy({ left: event.key === "ArrowLeft" ? -40 : 40 });
    }
  }}>
    <div className="sg-fixed-number-gutter" aria-hidden="true">{labels.map(label => <span key={label.line} style={{ top: label.top }}>{label.line}</span>)}</div>
    <div ref={horizontalRef} className="sg-guide-horizontal-scroll" onScroll={event => syncHorizontalScroll(event, scrollbarRef.current)}><div ref={contentRef} className="sg-guide-scroll-content">{children}</div></div>
    <div ref={scrollbarRef} className="sg-guide-bottom-scrollbar" aria-hidden="true" onScroll={event => syncHorizontalScroll(event, horizontalRef.current)}><div ref={scrollbarContentRef} /></div>
  </div>;
});
