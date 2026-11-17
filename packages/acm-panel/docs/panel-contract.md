# Panel card contract

The first public contract is v0.1.0. PanelCard owns a white, bordered, rounded
card surface with an optional eyebrow and description, a labelled heading, a
consumer-supplied header-actions slot, body content and optional footer. The
stylesheet is available through @acm/panel/styles.css.

The card does not set its position, width, height, sticky behaviour or overflow.
It does not implement close, resize or collapse actions. Consumers provide
those behaviours and keep application state in the owning product. The root is
a labelled aside; the generated heading ID is unique per instance.

The documented CSS custom properties are:

- --acm-panel-surface
- --acm-panel-border
- --acm-panel-text
- --acm-panel-muted
- --acm-panel-radius
- --acm-panel-padding
- --acm-panel-shadow

Each accepts an ACM universal style token as its fallback when the consuming
interface provides @acm/styles.
