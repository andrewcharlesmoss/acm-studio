# ACM Ribbon project instructions

## Purpose

acm-ribbon owns the reusable React ribbon foundation for all ACM projects. It must remain product-neutral. Consumers own commands, permissions, persistence, navigation, icons and brand content.

## Commands

- Run npm test and npm run typecheck from the project root.

## Verification

Test tab navigation, unique IDs, fixed panel height, hidden inactive panels, button sizes, toggle state and keyboard focus. Verify at least one consumer in a browser after changes.

## Compatibility

Support React 18 or later. Keep the public exports and styles.css entry point backwards compatible within the 0.x development line unless a consumer migration is included.

## Ownership boundary

The package owns ribbon structure, interaction semantics, accessibility wiring,
tokens and shared control styling. It does not own product commands,
permissions, persistence, navigation, application state or product branding.
Consumers must keep those concerns in their own projects and should use the
documented public exports rather than importing internal source paths.
