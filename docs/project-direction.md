# ACM priorities and the personal website redesign

Decision recorded on 12 November 2026 from Andrew's direction in the website
and universal styles discussion. This is the current priority decision;
the redesign, theme, and WordPress integration remain future work.

## Current priorities

Prioritise a holistic redesign of the existing WordPress site at
`andrewmoss.me`. Use that real website to establish a practical, reusable ACM
design foundation. The next phase is ACM Account integration with WordPress,
followed by a return to Loquafy with shared design and identity foundations.
Andrew wants a clearer personal direction as the work moves into 2027; the
delivery scope and release date still need to be established.

ACM Studio remains active for its reusable tools, including the Ribbon, Panes,
icons, styles, and image tools. Development of its custom Gutenberg equivalent,
content editor, and Site Editor takes a back seat. Preserve their existing
implementation and recoverable data. New editor expansion is outside the
current priority unless Andrew explicitly scopes it again.

Embrace WordPress as the established website editing and publishing foundation.
Evaluate custom development against the concrete capability it adds and the
product work it delays. An owned ACM ecosystem can use established software
while retaining control of its branding, content, shared design, and explicit
integration contracts.

## The personal website comes first

The target is `andrewmoss.me`, which Andrew identifies as a WordPress site using
Kadence and the Customizer. It is distinct from the separate React/Vinext Sites
implementation in the `andrew-moss` repository. Work on one must identify its
target explicitly; neither is an implicit replacement or deployment source for
the other.

The redesign covers purpose, audience, positioning, content, information
architecture, visual identity, and the visitor's next steps. The existing site
provides useful writing, work, images, and history. Its current design and page
structure do not constrain the new direction. A visual reproduction of the
Kadence site would not satisfy the brief.

Excel should retain a meaningful place alongside Andrew's broader work and
interests, including writing, data, football, technology, and building projects.
He wants freedom to explore different subjects and a rounded personal identity.
The final positioning, professional description, sitemap, and balance between
work and writing remain open. Earlier mock-ups and assistant suggestions are
exploratory inputs, not approved designs or claims about his experience.

Begin with the personal direction and content brief, followed by design and
implementation on a local copy of the WordPress site. Inventory Kadence-specific
templates, settings, plugins, snippets, and content dependencies before changing
the theme in that copy. A planned move to the Site Editor is a theme migration;
Kadence's design does not automatically transfer to a Twenty Twenty-Five child.
Any staging or production work needs its own verified target and supported
publication procedure under the applicable project instructions.

## Shared theme direction

Use Twenty Twenty-Five as the starting parent theme and learn the block child
theme workflow through the personal redesign. Develop one reusable ACM child
theme that can serve multiple WordPress sites, with the personal site as its
first real application. A newer default theme is something to assess later,
rather than a dependency that postpones this work.

The intended cascade is the parent theme's starting design, shared ACM
adjustments in the child theme, site customisations, and more specific block or
element choices. WordPress core also supplies underlying defaults. Block styling
is a scope available within several layers: a default for all blocks of a type
differs from a change to one block instance. Standard WordPress parent/child
inheritance has two theme levels; this direction does not require a child of a
child theme.

The redesigned personal site should establish the shared foundation through
actual use. Keep common rules reusable and site differences explicit:

| Shared ACM foundation | Site choices |
| --- | --- |
| Font family, body size, and heading scale | Logo, site name, and identity assets |
| Header positioning, content widths, and spacing | Header and body background colours |
| Footer structure and typography | Footer colours, wording, and links |
| Buttons, links, forms, and responsive behaviour | Brand accents, navigation destinations, and content |

For example, Loquafy's public website could use the same positioning and type
scale with its own logo, navigation/footer treatment, and background. Operational
applications can reuse the design language with layouts appropriate to their
tasks; they do not automatically inherit a WordPress theme.

Avoid repeating all shared rules in a different child theme for every site.
The intended site layer holds only deliberate differences from the shared base.
Site Editor customisations are stored in WordPress's database, so reusable edits
made there need a deliberate route back into the child theme.
Do not assume editing a reusable value in the Site Editor updates every site.

## Style guide and integration boundary

### Agreed website style ownership

WordPress will own the universal website design. Use the Site Editor in one
designated local theme-development installation to author those choices, then
save intended universal changes into the shared ACM child-theme files, using
Create Block Theme or a verified equivalent workflow. Ordinary Site Editor
saves remain installation-specific database overrides until captured into files.

The intended canonical universal baseline is the resolved combination of a
recorded Twenty Twenty-Five parent-theme version and the ACM child theme.
The child supplies ACM overrides while retaining inherited parent values.
Read both themes when deriving shared values; the child alone is incomplete.
Account for relevant CSS and font assets as well as `theme.json`. Test parent
updates because they can change inherited defaults. Individual sites' identity,
branding, saved templates, and style overrides remain outside the universal
baseline; explicit site or block overrides can mask later theme defaults.

### Shared styling package and distribution

Adapt the existing `@acm/styles` package through an explicit, verified migration
to distribute supported website values to applications outside WordPress.
The planned flow is:

1. Author universal website styles in the designated WordPress Site Editor.
2. Save the intended changes into the ACM child theme and review the files.
3. Resolve the recorded parent and child inputs through a conversion boundary.
4. Generate the supported shared styling package and website-style guide tables.
5. Test and release the theme and corresponding package, then update and deploy
   each consumer through its own authorised workflow.

Fonts, semantic colours, heading sizes, spacing, borders, and content widths
are candidates for the shared contract. The exact mapping still needs design
and consumer checks. WordPress templates, block behaviour, and complete layouts
do not automatically translate into application components. A shared header
redesign may require corresponding application-component work even when its
design values are shared.

Consumers will receive approved versions through updates and deployment, not
instant changes from a live WordPress installation. Record source theme
versions and conversion provenance, validate generated output, and report
unsupported settings and conflicts. Preserve unsupported authored values for
review rather than silently dropping or overwriting them. Derived outputs must
not become independently editable baselines or introduce uncontrolled two-way
synchronisation.

### ACM Studio guide and interface styling

After migration, ACM Studio's website-style guide will display derived values
and live previews instead of offering a second set of independent website
styling controls. Generated website tables must remain in the canonical
Markdown so formatted and source views continue to show the same content and
accurate line numbers. Written guidance, accessibility requirements, usage
rules, and design decisions remain manually authored.

The Ribbon, Panes, Panels, specialist controls, and Studio interface tokens
retain their ACM-owned component and styling contracts. WordPress website
updates must not overwrite their appearance or interaction behaviour. Keep
website exports scoped to their consumers rather than applying blanket CSS
that changes these interfaces. A shared package can carry distinct website
and interface contracts without giving WordPress ownership of both.

### Current implementation and transition

This is the agreed future direction, not an implemented bridge. The current
canonical style-value source remains `workspace-governance/STYLE_GUIDE.md`, with
the existing `@acm/styles` validation, Studio controls, and saving gateway.
This documentation does not change tokens, disable controls, or replace current
values with Twenty Twenty-Five defaults.

Implement the ownership transfer, generation, gateway/control changes, and
affected consumer compatibility as separately scoped migration work. Update the
governing style documentation and contracts together before switching authority.
Prove the personal-site design first and automate demonstrated needs; the full
bridge must not become a prerequisite for delivering that redesign.

## Loquafy marketing site and application

Keep Loquafy's existing marketing site and Node.js application outside WordPress.
Retain their current project and hosting arrangements for now; this decision
does not require splitting repositories or changing deployments. The marketing
site is a small website whose current needs do not justify a WordPress migration.
Reconsider that choice if regular visual editing or substantial publishing
becomes useful. The application retains its own functionality, backend, routing,
and layouts.

Both the marketing site and application are intended consumers of the shared
website styling package once the bridge and their adoption are implemented.
They can inherit supported ACM defaults while keeping explicit Loquafy branding
overrides and specialist component styles. Neither currently inherits a
WordPress theme automatically. Adopt and verify the package in each consumer
through separately scoped Loquafy work.

Codex remains a development tool for WordPress and standalone projects.
Projects belong to their own frameworks, runtimes, and hosting arrangements;
being built with Codex does not determine whether they should use WordPress.
The ecosystem's consistency comes from shared standards and explicit integration
contracts, without requiring every project to use the same platform.

## ACM Account follows the website phase

Andrew subsequently specified ACM Account as the next phase after the personal
website redesign. He has already built a version of it in Codex. Preserve it as
an independent product with its own registration, sign-in, account management,
and administration interface. Its intended role is universal identity across
`andrewmoss.me` and other ACM projects.

Investigate the existing Account implementation and its authentication contract
before choosing a WordPress connector. OpenID Connect is a possible integration
route, not an already verified connection. Keep canonical ACM identity separate
from WordPress user records, site roles, and product-owned data. Define account
linking, registration, site sessions, logout, revocation, and recovery explicitly;
shared identity does not automatically synchronise those behaviours.

Pilot the integration with the redesigned WordPress personal site, then use the
verified contract for subsequent projects, including Loquafy. Website theme work
can provide the account entry points; authentication belongs to ACM Account and
the site's explicit integration rather than the shared theme's presentation.
The precise integration scope and acceptance criteria remain to be established.

## Lessons for future work

- Judge a build by its maintenance cost and the important work it delays, as
  well as technical feasibility. AI-assisted implementation does not remove
  testing, integration, compatibility, and ongoing ownership costs.
- Challenge ambitious platform work early. The assistant should explain
  practical alternatives, opportunity cost, and a bounded route to a useful
  outcome before encouraging a custom equivalent of mature software.
- October's editor work had an opportunity cost. Some components and knowledge
  remain useful, but earlier investment does not require further investment.
  Preserve reusable work and make the next decision against current priorities.
- Derive reusable foundations from real products. Use the personal redesign to
  establish the shared rules that other sites actually need.
- Give preparation a finishing point. A useful shared theme, documented design
  choices, and a supported editing/publication workflow complete the website
  phase. Follow with a bounded ACM Account integration pilot before returning
  to Loquafy. A complete ecosystem, universal editor, and automated style bridge
  must not become assumed prerequisites.
- Treat broader interests as a content and positioning question. Keep Excel's
  strengths visible while allowing Andrew's work and writing to evolve.
- Distinguish agreed direction, assistant proposals, implemented behaviour,
  and verified results. Revisit a decision when evidence or Andrew's priorities
  change, and record the reason rather than silently reversing course.

## Working sequence and next decisions

1. Agree the personal site's purpose, audiences, positioning, and content brief.
2. Review existing content and choose a sitemap and page priorities.
3. Explore genuinely different visual directions using real content and images.
4. Build the selected design locally with Twenty Twenty-Five and the ACM child
   theme, checking representative pages and responsive behaviour.
5. Record the proven shared defaults and site exceptions, with a repeatable way
   to capture reusable Site Editor changes and review them in versioned files.
6. Follow the site's verified release process when publication is authorised.
7. Assess and integrate the existing ACM Account service with WordPress through
   a bounded personal-site pilot and explicit identity/session contracts.
8. Return to Loquafy and extend the common foundation for demonstrated needs.

This sequence is the working plan. WordPress ownership of universal website
styles and Loquafy's platform boundary are agreed. Theme naming, exact design
values, the final content direction, the conversion mapping, and migration and
release details remain open.
The record itself changes no live site, theme, data, shared token, or deployment.

## Related documentation

- [Project instructions](../AGENTS.md) — current priorities and implementation boundaries.
- [Original Studio foundation](FOUNDATION.md) — retained architecture and local data limits.
- [Studio UI Library](studio-ui-library.md) — reusable components and style-guide controls.
- [WordPress child themes](https://developer.wordpress.org/themes/advanced-topics/child-themes/)
  and [Global Settings and Styles](https://developer.wordpress.org/themes/core-concepts/global-settings-and-styles/)
  — implementation references to check against the actual WordPress version.
