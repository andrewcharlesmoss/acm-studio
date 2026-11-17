# Copilot artwork provenance

Andrew authorised use of a sourced Copilot SVG on 26 September 2026.
This is a narrow exception to the original-artwork rule for `keyboard.copilot`.

- Source: [Lobe Icons monochrome Copilot SVG](https://github.com/lobehub/lobe-icons/blob/329f378cbd1a88f45b60cd096b9111ce16f3ea39/packages/static-svg/icons/copilot.svg)
- Upstream revision: `329f378cbd1a88f45b60cd096b9111ce16f3ea39`
- Original SHA-256: `6708c5eb7fd426d3bd0de54edcecbb2a96bfcfd40ae1eb5745b0c12e19c8f1d2`
- Licence: MIT, copyright (c) 2023 LobeHub; see `LICENSE.txt`.
- Copilot is Microsoft's brand. The source is a community asset, not an
  original ACM symbol or a claim of Microsoft endorsement.

The source file is preserved verbatim. `scripts/import-copilot.py` converts
relative commands and arcs to the existing safe absolute cubic grammar and
uniformly scales the mark to 87.5% about its centre. Its shape is preserved;
all three scale names intentionally share the same brand geometry.

From the package root, with the existing pinned `fonttools==4.60.1` environment:

```sh
python scripts/import-copilot.py
npm run build
npm test
```

The package includes this source record and licence. Generated standalone SVGs
and Studio SVG downloads include the MIT notice as metadata. Retain the licence
when redistributing the vector asset or copies of the package.
