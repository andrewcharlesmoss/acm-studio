# ACM Icons project instructions

## Purpose and ownership boundary

This Studio-owned package owns original ACM SVG symbols, their editable masters,
metadata, generation and React rendering contract. Inherit the shared workspace
`AGENTS.md` and `STYLE_GUIDE.md` in `../../../workspace-governance/`.

Use British English. Read SPECIFICATION.md before changing symbols. Masters
are the source of truth; regenerate distribution files with `npm run build`.
Run `npm test` and inspect all three scales at intended sizes in Studio's
Ribbon Library. Keep symbols product-neutral and preserve stable semantic IDs.
Andrew explicitly authorises generated ACM artwork that faithfully reproduces
third-party social-service brand icons from supplied visual references. This
permits close visual copies of the marks, but not copying source SVG files, path
data, or downloaded artwork. Label each as a generated reproduction, not an
official asset, and record its visual reference and that no source artwork was
copied. For imported artwork, retain its source, provenance and licence details.
The specifically authorised Copilot SVG from Lobe Icons under MIT remains the
only imported third-party icon path; preserve `sources/copilot/` and its licence
notices. All three Copilot scales retain the same source geometry.
Inter-derived keyboard lettering and H1–H6 heading marks are also authorised
font-outline exceptions, generated from the pinned licensed font as documented
in SPECIFICATION.md; preserve their provenance and licence. Andrew authorised
the Heading marks to use Inter on 2 October 2026. Do not add browser persistence or provider code.

The package is private development v0.35.1 within ACM Studio. Follow Studio’s
Git workflow. Publication requires explicit authorisation.
