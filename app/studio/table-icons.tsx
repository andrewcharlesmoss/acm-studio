/**
 * Table icon paths from WordPress Gutenberg, copyright 2016–2026 the contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 * Source revision: 1addb122219043a1ac1c38f817c71255ae16d6e3
 * Adapted to a React wrapper on 2026-08-30; SVG paths are unmodified.
 * See docs/third-party/gutenberg.md and gutenberg-LICENSE.md for provenance.
 */

const tableActionPaths = {
  "insert-row-before": "M21 5c0-1.1-.9-2-2-2H5c-1 0-1.9.8-2 1.8V19.2c.1.9.9 1.7 1.8 1.8H19c1.1 0 2-.9 2-2V5ZM4.5 14V5c0-.3.2-.5.5-.5h14c.3 0 .5.2.5.5v9h-15Zm4 5.5H5c-.3 0-.5-.2-.5-.5v-3.5h4v4Zm5.5 0h-4v-4h4v4Zm5.5-.5c0 .3-.2.5-.5.5h-3.5v-4h4V19ZM11.2 10h-3V8.5h3v-3h1.5v3h3V10h-3v3h-1.5v-3Z",
  "insert-row-after": "M19 3H4.8c-.9.1-1.7.9-1.8 1.8V19.2c.1 1 1 1.8 2 1.8h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-9 1.5h4v4h-4v-4ZM4.5 5c0-.3.2-.5.5-.5h3.5v4h-4V5Zm15 14c0 .3-.2.5-.5.5H5c-.3 0-.5-.2-.5-.5v-9h15v9Zm0-10.5h-4v-4H19c.3 0 .5.2.5.5v3.5Zm-8.3 10h1.5v-3h3V14h-3v-3h-1.5v3h-3v1.5h3v3Z",
  "delete-row": "M19 3H4.8c-.9.1-1.7.9-1.8 1.8V19.2c.1 1 1 1.8 2 1.8h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm.5 16c0 .3-.2.5-.5.5H5c-.3 0-.5-.2-.5-.5v-9h15v9Zm0-10.5h-15V5c0-.3.2-.5.5-.5h14c.3 0 .5.2.5.5v3.5Zm-9.6 9.4 2.1-2.1 2.1 2.1 1.1-1.1-2.1-2.1 2.1-2.1-1.1-1.1-2.1 2.1-2.1-2.1-1.1 1.1 2.1 2.1-2.1 2.1 1.1 1.1Z",
  "insert-column-before": "M19 3H5c-1.1 0-2 .9-2 2v14c0 1 .8 1.9 1.8 2H19.2c.9-.1 1.7-.9 1.8-1.8V5c0-1.1-.9-2-2-2Zm-5 16.5H5c-.3 0-.5-.2-.5-.5V5c0-.3.2-.5.5-.5h9v15Zm5.5-.5c0 .3-.2.5-.5.5h-3.5v-4h4V19Zm0-5h-4v-4h4v4Zm0-5.5h-4v-4H19c.3 0 .5.2.5.5v3.5Zm-11 7.3H10v-3h3v-1.5h-3v-3H8.5v3h-3v1.5h3v3Z",
  "insert-column-after": "M19 3H5c-1.1 0-2 .9-2 2v14.2c.1.9.9 1.7 1.8 1.8H19.2c1-.1 1.8-1 1.8-2V5c0-1.1-.9-2-2-2ZM8.5 19.5H5c-.3 0-.5-.2-.5-.5v-3.5h4v4Zm0-5.5h-4v-4h4v4Zm0-5.5h-4V5c0-.3.2-.5.5-.5h3.5v4Zm11 10.5c0 .3-.2.5-.5.5h-9v-15h9c.3 0 .5.2.5.5v14Zm-4-10.8H14v3h-3v1.5h3v3h1.5v-3h3v-1.5h-3v-3Z",
  "delete-column": "M19 3H5c-1.1 0-2 .9-2 2v14.2c.1.9.9 1.7 1.8 1.8H19.2c1-.1 1.8-1 1.8-2V5c0-1.1-.9-2-2-2ZM8.5 19.5H5c-.3 0-.5-.2-.5-.5V5c0-.3.2-.5.5-.5h3.5v15Zm11-.5c0 .3-.2.5-.5.5h-9v-15h9c.3 0 .5.2.5.5v14ZM16.9 8.8l-2.1 2.1-2.1-2.1-1.1 1.1 2.1 2.1-2.1 2.1 1.1 1.1 2.1-2.1 2.1 2.1 1.1-1.1-2.1-2.1L18 9.9l-1.1-1.1Z",
};

export type TableAction = keyof typeof tableActionPaths;

export function TableIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" focusable="false"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm.5 2v6.2h-6.8V4.4h6.2c.3 0 .5.2.5.5ZM5 4.5h6.2v6.8H4.4V5.1c0-.3.2-.5.5-.5ZM4.5 19v-6.2h6.8v6.8H5.1c-.3 0-.5-.2-.5-.5Zm14.5.5h-6.2v-6.8h6.8v6.2c0 .3-.2.5-.5.5Z" /></svg>;
}

export function TableActionIcon({ action }: { action: TableAction }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" focusable="false"><path d={tableActionPaths[action]} /></svg>;
}

