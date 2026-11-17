# ACM Panel

@acm/panel provides a product-neutral card panel for ACM interfaces. The card
owns its labelled header, optional description, consumer-supplied actions,
body and optional footer. Consumers own placement, width, resizing, visibility,
content, commands, permissions and persistence.

## Use

Add the local package as a dependency and import its public component and
stylesheet:

    import { PanelCard } from "@acm/panel";
    import "@acm/panel/styles.css";

    <PanelCard
      eyebrow="Account record"
      title="@local_user"
      description="Local User · local_user@example.test"
      headerActions={<button type="button">Close</button>}
    >
      <dl>{/* Product-owned fields */}</dl>
    </PanelCard>

The component renders a labelled complementary region. Put a visible, named
close control in headerActions when the panel can be dismissed. Use a separate
layout component when the consumer needs to position or resize the card. See
the [Panel card contract](docs/panel-contract.md) for the initial API and CSS tokens.

## Development

Run npm test and npm run typecheck from this directory. The Studio UI Library
contains the shared visual specimen. ACM Account remains the owner of account
fields and actions.
