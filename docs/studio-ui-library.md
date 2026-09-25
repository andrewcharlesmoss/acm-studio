# Studio UI Library

## Purpose and organisation

Open `/studio/ui` from the Studio dashboard or its content and template tools.
The library has four sections:

- **Workspace** — a combined live Ribbon and two resizable panes around a centre
  workspace, assembled from the shared components and temporary fixtures.
- **Ribbon** — Ribbon component structure, controls and isolated Studio/Account
  product examples.
- **Panes** — shared Pane structure, optional regions, resize/collapse behaviour
  and isolated Studio examples.
- **Icons** — original shared ACM symbols, metadata, provenance and optical
  specimens at 16, 24 and 32px.

The Ribbon section is `/studio/ui/ribbon`, Panes is `/studio/ui/panes`, and Icons
is `/studio/ui/icons`. `/studio/ribbon` and `/studio/panes` remain compatible
redirects. Studio navigation links to the combined library.

## Ownership boundaries

The library groups reference views without combining package ownership. The
sibling `@acm/icons` package owns original symbol artwork and metadata. The
Ribbon and Pane implementations remain in their existing modules and retain
their own contracts. Workspace composes the shared components; it does not
copy either implementation or use product stores.

All fixtures and interactions remain temporary component state. The library
does not call product APIs, use write ownership or read/write browser storage.
Ribbon icon usage in the inspector means examples in the Ribbon catalogue only;
it is not an exhaustive inventory of use throughout ACM products.

## Shared tab indicator

The Studio UI Library owns the common Ribbon and Pane underline rule. At rest,
the line matches the label. Hover or keyboard focus expands it to the padded tab
edge, and leaving that state retracts it. The underline remains line-only, with
no hover background block. `@acm/ribbon` implements the Ribbon behaviour and
Studio Pane tabs follow the same geometry and motion. Product consumers may
theme indicator colours but should not replace the shared sizing or transition.

## Verification

From the ACM Studio repository root:

```sh
node --experimental-strip-types --test tests/studio-ui-library.test.mjs tests/ribbon-catalogue.test.mjs tests/pane-library.test.mjs
npx tsc --project tsconfig.ribbon.json --noEmit --pretty false
npx tsc --project tsconfig.panes.json --noEmit --pretty false
npm run build
npm run lint
git diff --check
```

In a browser, inspect all four sections, the legacy redirects, Ribbon and Pane
specimen interactions, icon search/selection/provenance, and the combined
Workspace with both panes expanded, resized and collapsed. Check keyboard
navigation and focus, desktop/tablet/mobile widths, and verify narrow preview
overflow stays inside the Workspace frame while the page itself remains usable.
