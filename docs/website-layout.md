# Shared website layout contract — v0.1.0

Studio owns this website presentation contract in `app/studio/website-layout.ts`.
The framework-neutral `@acm/styles` preset remains the universal ACM foundation;
it does not own website profiles or their persistence. The foundation supplies pure validation, inheritance resolution, and legacy
capture. The preview controls described below use that resolver with illustrative
in-memory data. Existing renderers, stores, gateways, fixtures, and generated
website output remain disconnected.

## Values and scope

All dimensions are finite CSS pixel numbers. Width limits accept 1–8192px and
gutters accept 0–512px, including fractional values. These are validation bounds,
not chosen design defaults or future slider ranges. No new defaults are applied
to existing sites. Other units and fluid expressions need a future contract
extension; the existing block length controls retain their supported units.

| Property | Meaning |
| --- | --- |
| `siteWidth` | `{ mode: "full" }` or `{ mode: "max", maxWidth: number }`; the outer site's maximum width |
| `contentWidth` | Maximum reading width for ordinary content |
| `wideWidth` | Maximum width for wide content |
| `gutters.desktop` | Minimum left/right inset on Desktop and the fallback for unspecified devices |
| `gutters.tablet` | Optional independent Tablet inset |
| `gutters.mobile` | Optional independent Mobile inset |

Widths are limits, not fixed dimensions. A future renderer must bound them by
available space and account for gutters and box sizing. Different limits are
not automatically sorted or clamped against each other. Resolving numbers is
not sufficient to establish rendered geometry.

Future responsive gutters use Studio's existing responsive-style ranges:
Mobile ≤480px, Tablet >480px and ≤782px, and Desktop >782px. This contract does
not change any existing container queries or Group stacking breakpoints.

## Inheritance

Resolution takes an explicit complete defaults object, one validated shared
profile, and optional sparse template overrides. Profiles use format
`acm-website-layout-profile`, version `0.1.0`, a stable lowercase hyphenated ID,
a display name, and sparse `overrides`. There are no profile chains or implicit
lookups. Site selection and bindings are deferred to the owning persistence
integration; this step introduces no site-specific template designs.

For each property, precedence is **defaults → profile → template**. A missing
property inherits. An explicitly stored value remains custom even when equal
to its parent. Reset to Inherited must remove the property, rather than copy the
parent's current value. Explicit `undefined` is invalid input; JSON omission
expresses inheritance. Zero gutters and Full Width are explicit values.

Gutter precedence is resolved independently per viewport. If no layer defines
Tablet or Mobile, it falls back to the resolved Desktop value. Mobile never
inherits Tablet. An explicitly defined parent Mobile value still applies when
a child overrides Desktop alone. Resetting the child Mobile value therefore
reveals the parent Mobile value before Desktop fallback.

The resolver returns a fresh values object and an origin for every field:
`defaults`, `profile` with its ID, or `template`. Gutter origins also record the
source viewport, allowing future controls to distinguish shared inheritance
from Desktop fallback. Inputs are not mutated. Unknown keys, versions, modes,
units, and non-finite or out-of-bounds numbers fail explicitly without coercion.

## Legacy preservation

The old `layout.contentWidth` caps the template surface and supplies a content
fallback. The old `layout.spacing` is uniform surface padding and the root
Content-slot gutter. Wide and Full alignment also use existing gutter expansion,
with a 1280px wide fallback. Existing Groups can define their own length values.
These meanings are not equivalent to the four new website layout properties.

`captureLegacyWebsiteLayout` makes a detached, validated
`acm-legacy-website-layout` v0.1.0 record retaining all four old layout fields:
content width, spacing, radius, and border width. It does not fabricate site
width, wide width, responsive gutters, or a profile link. Equality with shared
defaults never implies inheritance. The legacy record cannot be validated as
a new profile.

This capture helper is not invoked by current loading or saving. Existing
template v0.32.0, workspace, publication, backup, and fixture contracts remain
unchanged. Existing CSS and rendering remain authoritative. Before activation,
a separately verified migration must preserve that legacy presentation until
the user deliberately adopts a shared profile. Do not persist these records
through current stores before versioning their owning contracts.

## Verification and next boundary

From the ACM Studio root:

```sh
node --experimental-strip-types --test tests/website-layout.test.mjs
npm run typecheck
npm run build
git diff --check
```

Tests cover per-field precedence, provenance, explicit equality, reset by
removal, responsive fallback, zero and Full Width, validation, immutable inputs,
and exact legacy capture. Existing template checks cover unchanged readers.
The contract itself remains dormant for existing websites; the isolated preview
controls require browser verification.
Future adoption requires Edit, Preview, and generated-output comparisons for
each site, responsive states, safe owned persistence, and recoverable migration.
Archives, persisted site-specific overrides, hosted publication, and deployment
remain outside this increment.

## Preview-only controls

Styles → Website Styles → Layout explores this contract without adopting it.
The sibling ACM Defaults section retains its existing universal preset editor;
switching scope preserves each editor's in-memory draft. The website controls
have no Save action, storage, gateway, or connection to existing templates.
Reloading discards the website preview draft. Reset Preview is local and undoable.

The controls own canonical example values: Full Width, 720px content, 1120px
wide content, and independent 24px gutters for Desktop, Tablet, and Mobile.
There is no profile or template selector. Reset to Default restores the selected
initial value; gutter reset affects only the selected device. The existing pure
resolver and dormant v0.1.0 contract remain unchanged.

The generic example uses the production TemplateEditor, StudioEditor and
StudioCanvas with isolated typed template nodes. Its header, ordinary text, wide
group and full-width group expose the layout differences in Edit and Preview.
A preview-owned CSS adapter applies site width and gutters to the canvas and
content/wide/full dimensions to its root block wrappers in both modes. It is
scoped to this example; existing editors and website rendering are unaffected.
Wide and full blocks remain bounded by the site area after gutters.

Layout and example-content histories are independent and memory-only, each
bounded to 60 changes. Layout shortcuts are scoped to the settings pane and layout toolbar; editor
shortcuts belong to the example workspace. Native fields retain native editing
history. Reset Preview restores layout defaults and recreates the example content;
layout reset remains undoable, while recreating the content clears its temporary
history. Reloading discards everything. The narrow editor keeps its existing
scrollable desktop workspace arrangement.

Sliders and numeric fields share validation; numeric fields support the contract's
full bounds and fractional values. Blank or invalid input does not change the
resolved preview. Verification includes `tests/website-layout-preview.test.mjs`
and `tests/website-layout-editor-example.test.mjs`, plus rendered Edit/Preview,
widths, gutters, responsive controls, editing, Undo/Redo and Reset checks.
Actual-site previews, persisted adoption and generated-output changes remain
outside this increment.
