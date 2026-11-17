# ACM Panel project instructions

## Purpose and ownership

@acm/panel owns product-neutral card panel structure and presentation for ACM
interfaces. It does not own placement, sizing, resizing, visibility, product
data, permissions, persistence, navigation, commands or product branding.
Consumers provide header actions and panel content.

## Compatibility and verification

The package is private and is in its initial 0.x development line. Preserve its
documented React props and CSS entry point unless all consumers migrate in the
same change. Run npm test and npm run typecheck from this directory. Verify
at least one real consumer in a browser for visible changes.

Inherit the workspace security, accessibility, style and release rules in
../../../workspace-governance/AGENTS.md and STYLE_GUIDE.md. Keep consumers on the
public package exports; do not import internal source paths.
