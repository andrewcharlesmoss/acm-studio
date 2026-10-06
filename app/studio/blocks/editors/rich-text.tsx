"use client";

import { mathRenderEntries, mathRun, mathObjectFromData, legacyMathFromData, validMathRun, mathAtRange, legacyMathAtRange, replaceRichTextRuns } from "../../../content/math-runs";
import { readMathClipboardRuns } from "../../math-clipboard";
import { mathObjectHtml, legacyMathHtml } from "../../../content/math-presentation";
import { inlineImageHtml, inlineImageFromData, inlineImageRun, validInlineImageRun, inlineImageAtRange } from "../../../content/inline-image";
import { footnoteReferenceRun, validFootnoteId, validFootnoteReference } from "../../../content/footnote-runs";
import { useFootnoteNumbers } from "../../footnote-numbers-context";
import { useRichTextEditing, useMathActivation, useImageActivation, useRichTextFeedback, useCaretFormatsChange } from "../../rich-text-editing-context";
import { richTextOffset, richTextPointAtOffset, richTextTrailingSeparatorLength } from "../../rich-text-dom";
import { AUTHORED_LINE_BREAK_HTML, LINE_BREAK_FILLER_HTML, isRichTextLineBreakFiller, insertRichTextLineBreak } from "../../rich-text-line-break";
import { marksAtCaret, changeCaretMark, formatCaretInsertion } from "../../../content/caret-formatting";
import { caretFormats, CARET_FORMAT_EVENT, type CaretFormatRequest, type CaretFormatSnapshot } from "../../caret-formatting-command";
import { useLayoutEffect, useRef, type ClipboardEvent as ReactClipboardEvent, type HTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type RefObject, type TextareaHTMLAttributes } from "react";
import type { IconName } from "@acm/icons";
import { useFitText } from "../../../components/fit-text-paragraph";
import { isInteractiveTextMark, normaliseTextRuns, plainTextFromRuns, safeImageSource, safeTextLink, textToRuns, updateTextMark, withoutInteractiveTextMarks } from "../../../content/rich-text";
import { type RichTextRun, type TextAlignment, type TextMark } from "../../../content/model";
import { scheduleBlockCommandFocus, type BlockCommandFocusTarget } from "../../block-command-focus";
import { StudioHoverIcon } from "../../studio-hover-icon";

export type TextSelection = { start: number; end: number };

export type RichTextEditorProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  withoutInteractiveFormatting?: boolean;
  fitText?: boolean;
  fitTextSignature?: string;
  as?: "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "dt" | "dd";
  text: string;
  runs?: RichTextRun[];
  mediaUrls?: Record<string, string>;
  onChange: (text: string, runs: RichTextRun[]) => void;
  onSelectionChange: (selection: TextSelection | null) => void;
  onLinkActivate: (selection: TextSelection) => void;
  onSplitParagraph?: (beforeRuns: RichTextRun[], afterRuns: RichTextRun[]) => BlockCommandFocusTarget;
  onMergeParagraphBackward?: () => { blockId: string; offset: number } | null;
  onSplitParagraphs?: (paragraphs: RichTextRun[][]) => string[] | null;
  navigationRootRef?: RefObject<HTMLElement | null>;
};

export function RichTextEditor({ as: elementName = "div", text, runs, mediaUrls = {}, onChange: onContentChange, onSelectionChange, onLinkActivate, onSplitParagraph, onMergeParagraphBackward, onSplitParagraphs, onKeyDown: onKeyDownProp, className, fitText = false, fitTextSignature = "", navigationRootRef, withoutInteractiveFormatting = false, ...props }: RichTextEditorProps) {
  const footnoteNumbers = useFootnoteNumbers();
  const editable = useRichTextEditing(props.contentEditable);
  const activateMath = useMathActivation();
  const activateImage = useImageActivation();
  const reportFeedback = useRichTextFeedback();
  const reportCaretFormats = useCaretFormatsChange();
  const Tag = elementName as "div";
  const editorRef = useRef<HTMLDivElement>(null);
  const normalizationAttemptRef = useRef<string | null>(null);
  const pendingFormatsRef = useRef<CaretFormatSnapshot | null>(null);
  const editorScope = () => navigationRootRef?.current ?? document;
  const sourceRuns = runs?.length ? runs : textToRuns(text);
  const renderedRuns = withoutInteractiveFormatting ? withoutInteractiveTextMarks(sourceRuns) : sourceRuns;
  function publishCaretFormats(editor = editorRef.current) {
    if (editor) reportCaretFormats?.(editor, pendingFormatsRef.current);
  }
  function onChange(nextText: string, nextRuns: RichTextRun[]) {
    const cleanRuns = withoutInteractiveFormatting ? withoutInteractiveTextMarks(nextRuns) : nextRuns;
    onContentChange(withoutInteractiveFormatting ? plainTextFromRuns(cleanRuns) : nextText, cleanRuns);
  }
  useFitText(editorRef, fitText, typeof props.style?.fontSize === "string" ? props.style.fontSize : "", `${text}|${className}|${fitTextSignature}|${props.style?.fontFamily}|${props.style?.fontWeight}|${props.style?.fontStyle}|${props.style?.letterSpacing}|${props.style?.lineHeight}`);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = runsToEditorHtml(renderedRuns, mediaUrls, footnoteNumbers);
    // Compare browser-normalised markup. Replacing an identical image node on
    // pointer-up would prevent its following click from reaching that node.
    const expected = document.createElement("template");
    expected.innerHTML = html;
    if (editor.innerHTML === expected.innerHTML) return;
    // Colour palettes own focus while updating the captured range.
    const selection = document.activeElement === editor ? selectionWithinEditor(editor) : null;
    editor.innerHTML = expected.innerHTML;
    if (selection) restoreEditorSelection(editor, selection);
  }, [renderedRuns, mediaUrls, footnoteNumbers]);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (pendingFormatsRef.current && (!editable || pendingFormatsRef.current.text !== text || pendingFormatsRef.current.baseline !== JSON.stringify(sourceRuns))) {
      pendingFormatsRef.current = null;
      publishCaretFormats(editor);
    }
    const handle = (event: Event) => {
      const request = (event as CustomEvent<CaretFormatRequest>).detail;
      const pending = pendingFormatsRef.current;
      const requestedMarks = withoutInteractiveFormatting ? request.marks?.filter(mark => !isInteractiveTextMark(mark)) : request.marks;
      if (requestedMarks) {
        pendingFormatsRef.current = { offset: request.offset, marks: requestedMarks, text, baseline: JSON.stringify(sourceRuns) };
        publishCaretFormats(editor);
      }
      request.result = requestedMarks ?? (pending?.offset === request.offset ? pending.marks : marksAtCaret(renderedRuns, request.offset));
    };
    editor.addEventListener(CARET_FORMAT_EVENT, handle);
    return () => editor.removeEventListener(CARET_FORMAT_EVENT, handle);
  });

  useLayoutEffect(() => {
    const editor = editorRef.current;
    return () => { if (editor) reportCaretFormats?.(editor, null); };
  }, [reportCaretFormats]);

  function readSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) {
      onSelectionChange(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const start = editorOffset(editor, range.startContainer, range.startOffset);
    const end = editorOffset(editor, range.endContainer, range.endOffset);
    if (pendingFormatsRef.current && (start !== end || start !== pendingFormatsRef.current.offset)) {
      pendingFormatsRef.current = null;
      publishCaretFormats(editor);
    }
    const selected = start <= end ? { start, end } : { start: end, end: start };
    onSelectionChange(selected);
    if (editable) activateImage?.(editor, selected);
    if (editable) activateMath?.(editor, selected);
  }

  function handleMathPaste(event: ReactClipboardEvent<HTMLDivElement>) {
    props.onPaste?.(event);
    if (event.defaultPrevented || !editable) return;
    const result = readMathClipboardRuns(event.clipboardData.getData("text/html"), editorToRuns);
    if (!result.handled) return;
    event.preventDefault();
    if ("error" in result) { reportFeedback?.(result.error); return; }
    const editor = editorRef.current;
    const selection = editor && selectionWithinEditor(editor);
    if (!editor || !selection) return;
    const next = replaceRichTextRuns(editorToRuns(editor), selection.start, selection.end, result.runs);
    if (!next) { reportFeedback?.("This inline content could not be pasted into the selected text."); return; }
    const clean = withoutInteractiveFormatting ? withoutInteractiveTextMarks(next) : next;
    const offset = selection.start + plainTextFromRuns(result.runs).length;
    pendingFormatsRef.current = null;
    publishCaretFormats(editor);
    editor.innerHTML = runsToEditorHtml(clean, mediaUrls, footnoteNumbers);
    onChange(plainTextFromRuns(clean), clean);
    restoreEditorSelection(editor, { start: offset, end: offset });
    onSelectionChange({ start: offset, end: offset });
  }

  function handleInput() {
    if (!editable) return;
    const editor = editorRef.current;
    if (!editor) return;
    let nextRuns = editorToRuns(editor);
    if (withoutInteractiveFormatting) nextRuns = withoutInteractiveTextMarks(nextRuns);
    const pending = pendingFormatsRef.current;
    if (pending) {
      const insertion = formatCaretInsertion(pending.text, nextRuns, pending.offset, pending.marks);
      if (insertion) { nextRuns = insertion.runs; pendingFormatsRef.current = { ...pending, offset: insertion.offset, text: insertion.text, baseline: JSON.stringify(nextRuns) }; }
      else pendingFormatsRef.current = null;
      publishCaretFormats(editor);
    }
    normalizationAttemptRef.current = null;
    onChange(plainTextFromRuns(nextRuns), nextRuns);
    readSelection();
  }

  function handleLineBreak(event: InputEvent) {
    if (!editable || event.defaultPrevented || event.isComposing || event.inputType !== "insertLineBreak") return;
    const editor = editorRef.current;
    const selection = editor && selectionWithinEditor(editor);
    if (!editor || !selection) return;
    const current = editorToRuns(editor);
    const pending = pendingFormatsRef.current;
    const pendingMarks = pending && selection.start === selection.end && pending.offset === selection.start
      && pending.text === plainTextFromRuns(current) ? pending.marks : undefined;
    const inserted = insertRichTextLineBreak(current, selection.start, selection.end, pendingMarks);
    if (!inserted) return;
    event.preventDefault();
    const next = withoutInteractiveFormatting ? withoutInteractiveTextMarks(inserted) : inserted;
    const nextText = plainTextFromRuns(next);
    const offset = selection.start + 1;
    const continuationMarks = pendingMarks ?? marksAtCaret(current, selection.start);
    pendingFormatsRef.current = { offset, marks: withoutInteractiveFormatting ? continuationMarks.filter(mark => !isInteractiveTextMark(mark)) : continuationMarks, text: nextText, baseline: JSON.stringify(next) };
    normalizationAttemptRef.current = nextText;
    editor.innerHTML = runsToEditorHtml(next, mediaUrls, footnoteNumbers);
    onChange(nextText, next);
    restoreEditorSelection(editor, { start: offset, end: offset });
    publishCaretFormats(editor);
    onSelectionChange({ start: offset, end: offset });
  }

  // React's beforeinput abstraction does not expose native inputType reliably.
  // Owning the native operation also covers virtual keyboard line breaks.
  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.addEventListener("beforeinput", handleLineBreak);
    return () => editor.removeEventListener("beforeinput", handleLineBreak);
  });

  function splitLegacyParagraphsOnFocus(editor: HTMLElement) {
    if (!editable) return;
    if (!onSplitParagraphs) return;
    // Modern runs contain authored soft breaks; only legacy plain text may
    // need its old blank-line paragraph projection normalising on focus.
    if (runs?.length) return;
    const sourceRuns = editorToRuns(editor);
    const sourceText = plainTextFromRuns(sourceRuns);
    if (normalizationAttemptRef.current === sourceText) return;
    const paragraphs = splitRunsAtBlankLines(sourceRuns);
    if (paragraphs.length < 2) return;
    const blockId = editor.dataset.studioBlockId ?? editor.dataset.blockId;
    if (!blockId) return;
    normalizationAttemptRef.current = sourceText;
    const selection = window.getSelection();
    const focusOffset = selection?.focusNode && editor.contains(selection.focusNode)
      ? editorTextOffset(editor, selection.focusNode, selection.focusOffset)
      : 0;
    let targetIndex = paragraphs.findIndex(part => focusOffset <= part.end);
    if (targetIndex < 0) targetIndex = paragraphs.length - 1;
    const targetOffset = Math.max(0, focusOffset - paragraphs[targetIndex].start);
    const ids = onSplitParagraphs(paragraphs.map(part => part.runs));
    if (!ids || ids.length !== paragraphs.length) return;
    onSelectionChange(null);
    window.requestAnimationFrame(() => {
      const target = [...editorScope().querySelectorAll<HTMLElement>(".rich-text-editor")]
        .find(candidate => candidate.dataset.studioBlockId === ids[targetIndex] || candidate.dataset.blockId === ids[targetIndex]);
      if (target) focusRichTextEditorAtOffset(target, targetOffset);
    });
  }

  function moveCaretBetweenEditors(event: ReactKeyboardEvent<HTMLDivElement>) {
    const editor = editorRef.current;
    if (!editor || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false;
    if (event.key === "ArrowRight") {
      const selection = window.getSelection();
      if (!editor.classList.contains("paragraph-field") || !selection?.isCollapsed || !selection.focusNode || !editor.contains(selection.focusNode)) return false;
      const caretOffset = editorTextOffset(editor, selection.focusNode, selection.focusOffset);
      const editorEnd = editorTextOffset(editor, editor, editor.childNodes.length);
      if (caretOffset !== editorEnd) return false;
      const paragraphs = [...editorScope().querySelectorAll<HTMLElement>(".rich-text-editor.paragraph-field[data-studio-block-id]")]
        .filter(candidate => candidate.isContentEditable && candidate.getClientRects().length > 0);
      const target = paragraphs[paragraphs.indexOf(editor) + 1];
      if (!target) {
        const blockPosition = editor.closest(".block-position");
        const nextPosition = blockPosition?.nextElementSibling;
        const appender = nextPosition?.classList.contains("canvas-appender")
          ? nextPosition.querySelector<HTMLInputElement>("input[placeholder='Type / to choose a block']")
          : null;
        if (!appender) return false;
        event.preventDefault();
        appender.focus({ preventScroll: true });
        appender.setSelectionRange(appender.value.length, appender.value.length);
        return true;
      }
      event.preventDefault();
      focusRichTextEditorAtOffset(target, 0);
      return true;
    }
    if (event.key === "ArrowLeft") {
      const selection = window.getSelection();
      if (!editor.classList.contains("paragraph-field") || !selection?.isCollapsed || !selection.focusNode || !editor.contains(selection.focusNode)) return false;
      const caretOffset = editorTextOffset(editor, selection.focusNode, selection.focusOffset);
      if (caretOffset !== 0) return false;
      const paragraphs = [...editorScope().querySelectorAll<HTMLElement>(".rich-text-editor.paragraph-field[data-studio-block-id]")]
        .filter(candidate => candidate.isContentEditable && candidate.getClientRects().length > 0);
      const target = paragraphs[paragraphs.indexOf(editor) - 1];
      if (!target) return false;
      const targetEnd = editorTextOffset(target, target, target.childNodes.length);
      event.preventDefault();
      focusRichTextEditorAtOffset(target, targetEnd);
      return true;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return false;
    const selection = window.getSelection();
    if (!selection?.isCollapsed || !selection.focusNode || !editor.contains(selection.focusNode)) return false;
    const caret = document.createRange();
    caret.setStart(selection.focusNode, selection.focusOffset);
    caret.collapse(true);
    const caretRect = caret.getBoundingClientRect();
    const content = document.createRange();
    content.selectNodeContents(editor);
    const lineRects = [...content.getClientRects()].filter(rect => rect.height > 0);
    const editorRect = editor.getBoundingClientRect();
    const firstLineTop = lineRects.length ? Math.min(...lineRects.map(rect => rect.top)) : editorRect.top;
    const lastLineBottom = lineRects.length ? Math.max(...lineRects.map(rect => rect.bottom)) : editorRect.bottom;
    const direction = event.key === "ArrowUp" ? -1 : 1;
    const editorLineHeight = Number.parseFloat(getComputedStyle(editor).lineHeight) || caretRect.height;
    const edgeTolerance = Math.max(3, Math.min(caretRect.height, editorLineHeight * 0.7));
    const atEdge = direction < 0
      ? caretRect.top <= firstLineTop + edgeTolerance
      : caretRect.bottom >= lastLineBottom - edgeTolerance;
    if (!atEdge) return false;
    const editors = [...editorScope().querySelectorAll<HTMLElement>(".rich-text-editor")].filter(candidate => candidate.isContentEditable && candidate.getClientRects().length > 0);
    const target = editors[editors.indexOf(editor) + direction];
    const blockPosition = editor.closest(".block-position");
    const nextIsAppender = direction > 0 && blockPosition?.nextElementSibling?.classList.contains("canvas-appender");
    const appender = nextIsAppender
      ? blockPosition?.nextElementSibling?.querySelector<HTMLInputElement>("input[placeholder='Type / to choose a block']")
      : null;
    if (appender && (!target || target.closest(".block-position") !== blockPosition)) {
      event.preventDefault();
      appender.focus({ preventScroll: true });
      appender.setSelectionRange(appender.value.length, appender.value.length);
      return true;
    }
    if (!target) return false;
    const targetRect = target.getBoundingClientRect();
    const lineHeight = Number.parseFloat(getComputedStyle(target).lineHeight) || caretRect.height || 20;
    const x = Math.max(targetRect.left + 1, Math.min(caretRect.left, targetRect.right - 1));
    const y = direction < 0 ? targetRect.bottom - lineHeight / 2 : targetRect.top + lineHeight / 2;
    const targetDocument = target.ownerDocument as Document & {
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    const caretPosition = targetDocument.caretPositionFromPoint?.(x, y);
    const point = caretPosition && target.contains(caretPosition.offsetNode)
      ? { node: caretPosition.offsetNode, offset: caretPosition.offset }
      : (() => {
          const range = targetDocument.caretRangeFromPoint?.(x, y);
          return range && target.contains(range.startContainer) ? { node: range.startContainer, offset: range.startOffset } : null;
        })();
    if (!point) return false;
    event.preventDefault();
    target.focus({ preventScroll: true });
    const nextRange = document.createRange();
    nextRange.setStart(point.node, point.offset);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    return true;
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!editable || event.defaultPrevented || event.nativeEvent?.isComposing) return;
    // A selected inline object's form owns Tab before List indentation.
    if (event.key === "Tab" && !event.shiftKey) {
      const editor = editorRef.current;
      const selection = editor ? selectionWithinEditor(editor) : null;
      if (editor && selection && inlineImageAtRange(renderedRuns, selection.start, selection.end)) {
        event.preventDefault(); activateImage?.(editor, selection, true);
        requestAnimationFrame(() => document.querySelector<HTMLInputElement>("[data-inline-image-width]")?.focus()); return;
      }
      if (editor && selection && selection.start !== selection.end && (mathAtRange(renderedRuns, selection.start, selection.end) || legacyMathAtRange(renderedRuns, selection.start, selection.end))) {
        event.preventDefault(); activateMath?.(editor, selection, true);
        requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>("[data-math-syntax]")?.focus()); return;
      }
    }
    onKeyDownProp?.(event);
    if (event.defaultPrevented) return;
    if (moveCaretBetweenEditors(event)) return;
    if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && ["b", "i"].includes(event.key.toLowerCase())) {
      const editor = editorRef.current;
      const selection = editor ? selectionWithinEditor(editor) : null;
      if (editor && selection) {
        event.preventDefault();
        const mark = event.key.toLowerCase() === "b" ? "bold" : "italic";
        if (selection.start === selection.end) {
          const marks = caretFormats(editor, selection.start) ?? [];
          caretFormats(editor, selection.start, changeCaretMark(marks, mark));
          readSelection();
        } else {
          const next = updateTextMark(editorToRuns(editor), selection.start, selection.end, mark);
          onChange(plainTextFromRuns(next), next);
        }
      }
      return;
    }
    if (event.key === "Backspace" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && onMergeParagraphBackward) {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (editor && selection?.isCollapsed && selection.rangeCount > 0 && editor.contains(selection.anchorNode) && editor.contains(selection.focusNode)) {
        const range = selection.getRangeAt(0);
        if (editorTextOffset(editor, range.startContainer, range.startOffset) === 0) {
          const merged = onMergeParagraphBackward();
          if (merged) {
            event.preventDefault();
            onSelectionChange(null);
            window.requestAnimationFrame(() => {
              const target = [...editorScope().querySelectorAll<HTMLElement>(".rich-text-editor")]
                .find((candidate) => candidate.dataset.studioBlockId === merged.blockId || candidate.dataset.blockId === merged.blockId);
              if (target) focusRichTextEditorAtOffset(target, merged.offset);
            });
            return;
          }
        }
      }
    }
    if (event.key !== "Enter" || event.shiftKey || !onSplitParagraph) return;
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return;
    event.preventDefault();

    const range = selection.getRangeAt(0);
    const sourceRuns = editorToRuns(editor);
    const sourceLength = plainTextFromRuns(sourceRuns).length;
    const firstOffset = Math.min(editorTextOffset(editor, range.startContainer, range.startOffset), sourceLength);
    const secondOffset = Math.min(editorTextOffset(editor, range.endContainer, range.endOffset), sourceLength);
    const selectionStart = Math.min(firstOffset, secondOffset);
    const selectionEnd = Math.max(firstOffset, secondOffset);
    const beforeRuns = sliceRichRuns(sourceRuns, 0, selectionStart);
    const afterRuns = sliceRichRuns(sourceRuns, selectionEnd, plainTextFromRuns(sourceRuns).length);
    const focusTarget = onSplitParagraph(beforeRuns, afterRuns);
    onSelectionChange(null);
    if (!focusTarget) return;

    scheduleBlockCommandFocus(editor, focusTarget, editorScope(), nextEditor => focusRichTextEditorAtOffset(nextEditor, 0));
  }

  // Select links in-place and show their Gutenberg-style controls instead of navigating away from Studio.
  return <Tag {...props} ref={editorRef} className={`${className ?? ""} rich-text-editor`} contentEditable={editable} aria-readonly={!editable || undefined} role="textbox" tabIndex={0} aria-multiline="true" suppressContentEditableWarning onInput={handleInput} onPaste={handleMathPaste} onKeyDown={handleKeyDown} onSelect={readSelection} onKeyUp={readSelection} onMouseUp={(event) => { readSelection(); splitLegacyParagraphsOnFocus(event.currentTarget); }} onFocus={(event) => { props.onFocus?.(event); readSelection(); const editor = event.currentTarget; window.requestAnimationFrame(() => { if (document.activeElement === editor) splitLegacyParagraphsOnFocus(editor); }); }} onClick={(event) => {
    if (event.defaultPrevented) return;
    const image = (event.target as HTMLElement).closest<HTMLElement>("[data-image-object]");
    if (image && editorRef.current?.contains(image) && editable) {
      event.preventDefault();
      const range = document.createRange(); range.selectNode(image);
      const selected = { start: editorOffset(editorRef.current, range.startContainer, range.startOffset), end: editorOffset(editorRef.current, range.endContainer, range.endOffset) };
      const native = window.getSelection(); native?.removeAllRanges(); native?.addRange(range);
      onSelectionChange(selected); activateImage?.(editorRef.current, selected, true); return;
    }
    const equation = (event.target as HTMLElement).closest<HTMLElement>("[data-math-object], [data-math-legacy]");
    if (equation && editorRef.current?.contains(equation) && editable) {
      event.preventDefault();
      const range = document.createRange(); range.selectNode(equation);
      const start = editorOffset(editorRef.current, range.startContainer, range.startOffset), end = editorOffset(editorRef.current, range.endContainer, range.endOffset);
      const selected = { start, end }; const native = window.getSelection(); native?.removeAllRanges(); native?.addRange(range);
      onSelectionChange(selected); activateMath?.(editorRef.current, selected, true); return;
    }
    const link = (event.target as HTMLElement).closest("a");
    if (!link || !editorRef.current?.contains(link)) return;
    event.preventDefault();
    const range = document.createRange();
    range.selectNodeContents(link);
    const nextSelection = { start: editorOffset(editorRef.current, range.startContainer, range.startOffset), end: editorOffset(editorRef.current, range.endContainer, range.endOffset) };
    const nativeSelection = window.getSelection();
    nativeSelection?.removeAllRanges();
    nativeSelection?.addRange(range);
    onSelectionChange(nextSelection);
    onLinkActivate(nextSelection);
  }} />;
}

export function preserveTextSelection(event: ReactMouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}

export function caretRangeAtPoint(x: number, y: number) {
  const target = document.elementFromPoint(x, y);
  if (!(target instanceof Element) || !target.closest(".canvas-block") || target.closest(".canvas-block-toolbar, button, input, textarea, select, [role=\"button\"]")) return null;
  const browserDocument = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const caret = browserDocument.caretPositionFromPoint?.(x, y);
  if (caret) {
    const range = document.createRange();
    range.setStart(caret.offsetNode, caret.offset);
    range.collapse(true);
    return range;
  }
  const range = browserDocument.caretRangeFromPoint?.(x, y) ?? null;
  if (!range) return null;
  range.collapse(true);
  return range;
}

export function editorOffset(root: HTMLElement, container: Node, offset: number) {
  return richTextOffset(root, container, offset) ?? 0;
}

export function editorTextOffset(root: HTMLElement, container: Node, offset: number) {
  return richTextOffset(root, container, offset) ?? 0;
}

export function selectionWithinEditor(editor: HTMLElement): TextSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return null;
  const range = selection.getRangeAt(0);
  const start = editorOffset(editor, range.startContainer, range.startOffset);
  const end = editorOffset(editor, range.endContainer, range.endOffset);
  return start <= end ? { start, end } : { start: end, end: start };
}

export function restoreEditorSelection(editor: HTMLElement, selection: TextSelection) {
  const start = editorPointAtOffset(editor, selection.start);
  const end = selection.start === selection.end ? start : richTextPointAtOffset(editor, selection.end, "backward");
  if (!start || !end) return;
  const range = document.createRange();
  const safeOffset = (point: { node: Node; offset: number }) => Math.min(Math.max(0, point.offset), point.node.nodeType === Node.TEXT_NODE ? point.node.nodeValue?.length ?? 0 : point.node.childNodes.length);
  range.setStart(start.node, safeOffset(start));
  range.setEnd(end.node, safeOffset(end));
  const nativeSelection = window.getSelection();
  if (!nativeSelection) return;
  nativeSelection.removeAllRanges();
  nativeSelection.addRange(range);
}

export function editorPointAtOffset(editor: HTMLElement, targetOffset: number) {
  return richTextPointAtOffset(editor, targetOffset);
}

export function applyCrossBlockSelection(start: Range, end: Range) {
  const selection = window.getSelection();
  if (!selection) return;
  if (selection.setBaseAndExtent) {
    selection.setBaseAndExtent(start.startContainer, start.startOffset, end.startContainer, end.startOffset);
    return;
  }
  const range = document.createRange();
  if (start.compareBoundaryPoints(Range.START_TO_START, end) <= 0) {
    range.setStart(start.startContainer, start.startOffset);
    range.setEnd(end.startContainer, end.startOffset);
  } else {
    range.setStart(end.startContainer, end.startOffset);
    range.setEnd(start.startContainer, start.startOffset);
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function runsToEditorHtml(runs: RichTextRun[], mediaUrls: Record<string, string> = {}, footnoteNumbers: Map<string, number> = new Map()) {
  const html = mathRenderEntries(runs).map(({ run, legacyRuns }) => {
    if (validInlineImageRun(run)) return inlineImageHtml(run.inline, mediaUrls, true);
    if (validMathRun(run)) return mathObjectHtml(run.inline, true);
    const legacyMath = legacyRuns ? legacyMathHtml(legacyRuns, true) : null;
    if (legacyMath) return legacyMath;
    if (run.inline && validFootnoteReference(run)) return `<sup contenteditable="false" data-footnote-object="${escapeHtml(run.inline.id)}"><a href="#footnote-${escapeHtml(run.inline.id)}" aria-label="Footnote ${footnoteNumbers.get(run.inline.id) ?? ""}">${footnoteNumbers.get(run.inline.id) ?? "†"}</a></sup>`;
    let html = escapeHtml(run.text).replace(/\n/g, AUTHORED_LINE_BREAK_HTML);
    for (const mark of run.marks ?? []) {
      if (mark === "bold") html = `<strong>${html}</strong>`;
      else if (mark === "italic") html = `<em>${html}</em>`;
      else if (mark === "strikethrough") html = `<s>${html}</s>`;
      else if (mark === "inline-code") html = `<code>${html}</code>`;
      else if (mark === "subscript") html = `<sub>${html}</sub>`;
      else if (mark === "superscript") html = `<sup>${html}</sup>`;
      else if (mark === "keyboard") html = `<kbd>${html}</kbd>`;
      else if (typeof mark !== "string" && mark.type === "highlight") {
        const style = `color:${escapeHtml(mark.textColor ?? "inherit")};background-color:${escapeHtml(mark.backgroundColor ?? "transparent")}`;
        html = `<mark${style ? ` style="${style}"` : ""}>${html}</mark>`;
      } else if (typeof mark !== "string" && mark.type === "language") html = `<bdo lang="${escapeHtml(mark.language)}" dir="${mark.direction}">${html}</bdo>`;
      else if (typeof mark !== "string" && mark.type === "math") html = `<span data-inline-math="true"${mark.latex ? ` data-math-latex="${escapeHtml(mark.latex)}"` : ""}${mark.mathml ? ` data-mathml="${escapeHtml(mark.mathml)}"` : ""} data-math-alt="${escapeHtml(mark.alternativeText)}">${html}</span>`;
      else if (typeof mark !== "string" && mark.type === "inline-image") {
        const source = mark.mediaId ? safeImageSource(mediaUrls[mark.mediaId] ?? "", { allowBlob: true }) : null;
        const fallbackSource = source ?? safeImageSource(mark.src ?? "");
        const image = fallbackSource ? `<img src="${escapeHtml(fallbackSource)}" alt="${escapeHtml(mark.alt)}"${mark.width ? ` width="${mark.width}"` : ""} />` : `<span>${escapeHtml(mark.alt)}</span>`;
        html = `<span contenteditable="false" class="rich-text-inline-image" data-inline-image="true"${mark.mediaId ? ` data-media-id="${escapeHtml(mark.mediaId)}"` : ""}${mark.src ? ` data-image-src="${escapeHtml(mark.src)}"` : ""} data-inline-text="${escapeHtml(run.text)}" data-image-alt="${escapeHtml(mark.alt)}"${mark.width ? ` data-image-width="${mark.width}"` : ""}>${image}<span class="rich-text-inline-image-offset" aria-hidden="true">${escapeHtml(run.text)}</span></span>`;
      } else if (typeof mark !== "string" && mark.type === "footnote") html = `<span data-footnote-ref="${escapeHtml(mark.id)}">${html}<sup data-footnote-marker="true">${footnoteNumbers.get(mark.id) ?? "†"}</sup></span>`;
      else {
        const href = safeTextLink(mark.url);
        if (href) html = `<a href="${escapeHtml(href)}"${mark.opensInNewTab ? " target=\"_blank\" rel=\"noopener noreferrer\"" : ""}>${html}</a>`;
      }
    }
    return html;
  }).join("");
  return html + (plainTextFromRuns(runs).endsWith("\n") ? LINE_BREAK_FILLER_HTML : "");
}

export function sliceRichRuns(runs: RichTextRun[], start: number, end: number) {
  let offset = 0;
  return normaliseTextRuns(runs.flatMap((run) => {
    const runStart = offset;
    const runEnd = runStart + run.text.length;
    offset = runEnd;
    const sliceStart = Math.max(start, runStart);
    const sliceEnd = Math.min(end, runEnd);
    if (sliceEnd <= sliceStart) return [];
    return [{ ...run, text: run.text.slice(sliceStart - runStart, sliceEnd - runStart), marks: run.marks?.length ? [...run.marks] : undefined }];
  }));
}

export function splitRunsAtBlankLines(runs: RichTextRun[]) {
  const text = plainTextFromRuns(runs);
  const parts: { runs: RichTextRun[]; start: number; end: number }[] = [];
  const separators = /\n[\t ]*\n+/g;
  let start = 0;
  for (const match of text.matchAll(separators)) {
    const separatorStart = match.index ?? start;
    if (separatorStart > start) parts.push({ runs: sliceRichRuns(runs, start, separatorStart), start, end: separatorStart });
    start = separatorStart + match[0].length;
  }
  if (start < text.length) parts.push({ runs: sliceRichRuns(runs, start, text.length), start, end: text.length });
  return parts;
}

export function focusRichTextEditorAtOffset(editor: HTMLElement, requestedOffset: number) {
  const point = richTextPointAtOffset(editor, requestedOffset);
  editor.focus({ preventScroll: true });
  const range = document.createRange();
  range.setStart(point.node, point.offset);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function editorToRuns(editor: HTMLElement) {
  const runs: RichTextRun[] = [];
  function visit(node: Node, inheritedMarks: TextMark[]) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) runs.push({ text: node.textContent, marks: inheritedMarks.length ? inheritedMarks : undefined });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    if (element.tagName === "BR") {
      if (!isRichTextLineBreakFiller(element)) runs.push({ text: "\n", marks: inheritedMarks.length ? inheritedMarks : undefined });
      return;
    }
    if (element.dataset.imageObject !== undefined) {
      const image = inlineImageFromData(element.dataset.imageObject);
      if (!image) throw new Error("Invalid saved inline image. Original content has been retained.");
      runs.push(inlineImageRun(image));
      return;
    }
    if (element.dataset.mathObject !== undefined || element.dataset.mathLegacy !== undefined) {
      const math = mathObjectFromData(element.dataset.mathObject);
      const legacy = legacyMathFromData(element.dataset.mathLegacy);
      if (math) runs.push(mathRun(math));
      else if (legacy) runs.push(...legacy);
      else throw new Error("Invalid saved mathematical expression. Original content has been retained.");
      return;
    }
    if (element.dataset.footnoteObject !== undefined) {
      if (validFootnoteId(element.dataset.footnoteObject)) runs.push(footnoteReferenceRun(element.dataset.footnoteObject));
      return;
    }
    if (element.dataset.inlineImage === "true") {
      const src = safeImageSource(element.dataset.imageSrc ?? "");
      const mediaId = element.dataset.mediaId;
      if (mediaId || src) runs.push({ text: element.dataset.inlineText ?? "", marks: [...inheritedMarks, { type: "inline-image", mediaId: mediaId || undefined, src: src ?? undefined, alt: element.dataset.imageAlt ?? "", width: Number(element.dataset.imageWidth) || undefined }] });
      return;
    }
    if (element.tagName === "MATH") {
      const latex = element.getAttribute("data-latex");
      const math = mathObjectFromData(JSON.stringify({ type: "math", ...(latex !== null ? { latex } : { mathml: element.outerHTML }), alternativeText: element.getAttribute("aria-label") ?? "" }));
      if (!math) throw new Error("Unsupported mathematical markup. Original content has been retained.");
      runs.push(mathRun(math));
      return;
    }
    const marks = [...inheritedMarks];
    if (element.tagName === "STRONG" || element.tagName === "B") marks.push("bold");
    if (element.tagName === "EM" || element.tagName === "I") marks.push("italic");
    if (["S", "STRIKE", "DEL"].includes(element.tagName)) marks.push("strikethrough");
    if (element.tagName === "CODE") marks.push("inline-code");
    if (element.tagName === "SUB") marks.push("subscript");
    if (element.tagName === "SUP") marks.push("superscript");
    if (element.tagName === "KBD") marks.push("keyboard");
    if (element.dataset.inlineMath === "true") marks.push({ type: "math", latex: element.dataset.mathLatex, mathml: element.dataset.mathml, alternativeText: element.dataset.mathAlt ?? element.textContent ?? "" });
    if (element.dataset.footnoteRef) marks.push({ type: "footnote", id: element.dataset.footnoteRef });
    if (element.tagName === "MARK") marks.push({ type: "highlight", textColor: element.style.color && element.style.color !== "inherit" ? element.style.color : undefined, backgroundColor: element.style.backgroundColor && element.style.backgroundColor !== "transparent" ? element.style.backgroundColor : undefined });
    if (element.lang || element.tagName === "BDO" && element.hasAttribute("dir")) marks.push({ type: "language", language: element.lang, direction: element.dir === "rtl" ? "rtl" : "ltr" });
    if (element.tagName === "A") {
      const href = safeTextLink(element.getAttribute("href") ?? "");
      if (href) marks.push({ type: "link", url: href, opensInNewTab: element.getAttribute("target") === "_blank" || undefined });
    }
    element.childNodes.forEach((child) => {
      if (child instanceof HTMLElement && child.dataset.footnoteMarker === "true") return;
      visit(child, marks);
    });
    if (element.tagName === "DIV" || element.tagName === "P") runs.push({ text: "\n" });
  }
  editor.childNodes.forEach((node) => visit(node, []));
  const nextRuns = normaliseTextRuns(runs);
  const last = nextRuns[nextRuns.length - 1];
  if (richTextTrailingSeparatorLength(editor) && last?.text.endsWith("\n")) last.text = last.text.slice(0, -1);
  return normaliseTextRuns(nextRuns);
}

export function AlignmentIcon({ align }: { align: TextAlignment }) {
  const icons: Record<TextAlignment, IconName> = { left: "text.align-left", centre: "text.align-centre", right: "text.align-right" };
  return <StudioHoverIcon name={icons[align]} />;
}

// Native textareas include glyph overflow in their height. Apply the same
// measurement to preview headings so later fields cannot shift between modes.
// Observe the stable wrapper instead of the element whose height is mutated;
// this avoids a ResizeObserver feedback loop during layout changes.
export function useFittedTextHeight<T extends HTMLElement>(value: unknown, active = true) {
  const textRef = useRef<T>(null);
  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element || !active) return;
    const resize = () => {
      element.style.height = "0px";
      // scrollHeight excludes borders, whereas our fields use border-box sizing.
      element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
    };
    let animationFrame = 0;
    const scheduleResize = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        animationFrame = 0;
        resize();
      });
    };
    scheduleResize();
    let width = element.clientWidth;
    const observedElement = element.parentElement ?? element;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth !== width) { width = element.clientWidth; scheduleResize(); }
    });
    observer.observe(observedElement);
    return () => {
      observer.disconnect();
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [value, active]);
  return textRef;
}

export function AutoResizeTextarea({ value, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const textareaRef = useFittedTextHeight<HTMLTextAreaElement>(value);
  return <textarea {...props} ref={textareaRef} rows={1} value={value} />;
}
