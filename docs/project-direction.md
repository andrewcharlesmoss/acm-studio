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
made there need a deliberate route back into the child theme or canonical guide.
Do not assume editing a reusable value in the Site Editor updates every site.

## Style guide and integration boundary

The canonical style-value source remains
`workspace-governance/STYLE_GUIDE.md`, with the existing `@acm/styles` validation
and consumer contracts. This decision does not replace its current values with
Twenty Twenty-Five values or change its parser and saving gateway.

Align the shared styling vocabulary with WordPress's Global Styles and
`theme.json` where useful. As the redesign establishes actual choices, record
their scope, parent-theme provenance and version, shared override, and any site
override. A resolved value is derived from those inputs, rather than becoming
another independently maintained baseline. Distinguish existing ACM defaults
from any proposed theme-based baseline until adoption is deliberately agreed.

The precise storage model and mapping between the guide, child theme, and
WordPress user customisations still need design and verification. WordPress
cannot read the current ACM Markdown guide automatically, and Codex-built
applications cannot directly inherit WordPress theme behaviour. Existing shared
packages and explicit adapters are the relevant boundaries.

Start with the minimum repeatable capture and review process needed for this
site. Automate proven needs later. Any future synchronisation must expose
differences and conflicts, preserve unsupported values, and define which scope
owns each value. Silent overwrites or uncontrolled last-write-wins syncing would
recreate the drift problem that prompted this discussion.

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

This sequence is the working plan. Theme naming, exact design values, the final
content direction, the guide mapping, and migration/release details remain open.
The record itself changes no live site, theme, data, shared token, or deployment.

## Related documentation

- [Project instructions](../AGENTS.md) — current priorities and implementation boundaries.
- [Original Studio foundation](FOUNDATION.md) — retained architecture and local data limits.
- [Studio UI Library](studio-ui-library.md) — reusable components and style-guide controls.
- [WordPress child themes](https://developer.wordpress.org/themes/advanced-topics/child-themes/)
  and [Global Settings and Styles](https://developer.wordpress.org/themes/core-concepts/global-settings-and-styles/)
  — implementation references to check against the actual WordPress version.
