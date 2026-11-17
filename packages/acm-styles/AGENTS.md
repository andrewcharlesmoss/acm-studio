# ACM Styles project instructions

## Purpose and ownership

ACM Styles owns framework-neutral style types, validation and CSS exports for
new ACM interface projects. The workspace governance `STYLE_GUIDE.md` is the
only stored source of style values and remains the policy source. Project-
specific branding and documented platform exceptions remain owned by each
product.

The package is versioned independently as @acm/styles. Consumers pass validated
style data into its CSS custom-property exports. It does not store canonical
token values or own a settings service,
project stores, site themes, or product-specific component contracts.

## Commands

Run npm test and npm run typecheck from this repository root.

## Verification

Test bounded input validation, JSON and CSS exports, font asset references,
and value agreement with workspace-governance/STYLE_GUIDE.md. Run git
diff --check before committing. Font files and the full SIL Open Font License
must remain together in src/fonts.
