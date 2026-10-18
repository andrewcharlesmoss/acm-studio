// Adapted from WordPress Twenty Twenty-Five, revision 62c10821880ac2242460e7ecf42727ce1a026047.
// GPL-2.0-or-later; provenance and licences: docs/site-editor-styles.md.
export const stylePalettes = [
  {
    "id": "default",
    "name": "Default",
    "colours": [
      "#FFFFFF",
      "#111111",
      "#FFEE58",
      "#F6CFF4",
      "#503AA8",
      "#686868",
      "#FBFAF3",
      "color-mix(in srgb, currentColor 20%, transparent)"
    ],
    "text": "#111111",
    "heading": "#111111",
    "buttonBackground": "#111111",
    "buttonText": "#FFFFFF"
  },
  {
    "id": "evening",
    "name": "Evening",
    "colours": [
      "#1B1B1B",
      "#F0F0F0",
      "#786D0A",
      "#442369",
      "#D1D0EA",
      "#CBCBCB",
      "#353535",
      "#FFFFFF33"
    ],
    "text": "#CBCBCB",
    "heading": "#CBCBCB",
    "buttonBackground": "#F0F0F0",
    "buttonText": "#1B1B1B"
  },
  {
    "id": "noon",
    "name": "Noon",
    "colours": [
      "#F8F7F5",
      "#191919",
      "#FFFFFF",
      "#F5B684",
      "#191919",
      "#5F5F5F",
      "#F1EEE9",
      "#19191933"
    ],
    "text": "#5F5F5F",
    "heading": "#191919",
    "buttonBackground": "#191919",
    "buttonText": "#F8F7F5"
  },
  {
    "id": "dusk",
    "name": "Dusk",
    "colours": [
      "#E2E2E2",
      "#3B3B3B",
      "#F5EDFF",
      "#650DD4",
      "#191919",
      "#5F5F5F",
      "#DBDBDB",
      "#3B3B3B33"
    ],
    "text": "#3B3B3B",
    "heading": "#191919",
    "buttonBackground": "#650DD4",
    "buttonText": "#E2E2E2"
  },
  {
    "id": "afternoon",
    "name": "Afternoon",
    "colours": [
      "#DAE7BD",
      "#516028",
      "#C7F642",
      "#EBF6D3",
      "#303D10",
      "#516028",
      "#EBF6D3",
      "#51602833"
    ],
    "text": "#516028",
    "heading": "#516028",
    "buttonBackground": "#516028",
    "buttonText": "#DAE7BD"
  },
  {
    "id": "twilight",
    "name": "Twilight",
    "colours": [
      "#131313",
      "#FFFFFF",
      "#4B52FF",
      "#FF7A5C",
      "#252525",
      "#FFFFFF",
      "#252525",
      "#FFFFFF33"
    ],
    "text": "#FFFFFF",
    "heading": "#FFFFFF",
    "buttonBackground": "#FFFFFF",
    "buttonText": "#131313"
  },
  {
    "id": "morning",
    "name": "Morning",
    "colours": [
      "#DFDCD7",
      "#191919",
      "#7A9BDB",
      "#F7E6FF",
      "#182949",
      "#5F5F5F",
      "#D7D3CC",
      "#19191933"
    ],
    "text": "#5F5F5F",
    "heading": "#191919",
    "buttonBackground": "#7A9BDB",
    "buttonText": "#191919"
  },
  {
    "id": "sunrise",
    "name": "Sunrise",
    "colours": [
      "#330616",
      "#FFFFFF",
      "#F0FDA6",
      "#DB9AB1",
      "#C1E4E7",
      "#DB9AB1",
      "#4A1628",
      "#DB9AB133"
    ],
    "text": "#DB9AB1",
    "heading": "#DB9AB1",
    "buttonBackground": "#DB9AB1",
    "buttonText": "#330616"
  },
  {
    "id": "midnight",
    "name": "Midnight",
    "colours": [
      "#4433A6",
      "#79F3B1",
      "#5644BC",
      "#372696",
      "#251D51",
      "#79F3B1",
      "#E8B7FF",
      "#79F3B133"
    ],
    "text": "#79F3B1",
    "heading": "#79F3B1",
    "buttonBackground": "#79F3B1",
    "buttonText": "#4433A6"
  }
] as const;

export const styleTypography = [
  {
    "id": "default",
    "name": "Default",
    "bodyFamily": "\"TT5 Manrope\", sans-serif",
    "headingFamily": "\"TT5 Manrope\", sans-serif",
    "bodyWeight": 300,
    "headingWeight": 400,
    "bodySize": "1.38rem",
    "bodyLineHeight": "1.4",
    "headingLineHeight": "1.125",
    "letterSpacing": "-0.1px",
    "headingLetterSpacing": "-0.1px"
  },
  {
    "id": "type-1",
    "name": "Beiruti & Literata",
    "bodyFamily": "\"TT5 Literata\", serif",
    "headingFamily": "\"TT5 Beiruti\", sans-serif",
    "bodyWeight": 300,
    "headingWeight": 500,
    "bodySize": "1rem",
    "bodyLineHeight": "1.6",
    "headingLineHeight": "1.02",
    "letterSpacing": "-0.01em",
    "headingLetterSpacing": "-0.02em"
  },
  {
    "id": "type-2",
    "name": "Vollkorn & Fira Code",
    "bodyFamily": "\"TT5 Fira Code\", monospace",
    "headingFamily": "\"TT5 Vollkorn\", serif",
    "bodyWeight": 300,
    "headingWeight": 400,
    "bodySize": "1rem",
    "bodyLineHeight": "1.5",
    "headingLineHeight": "1.125",
    "letterSpacing": "-0.18px",
    "headingLetterSpacing": "-0.1px"
  },
  {
    "id": "type-3",
    "name": "Platypi & Ysabeau Office",
    "bodyFamily": "\"TT5 Ysabeau Office\", sans-serif",
    "headingFamily": "\"TT5 Platypi\", serif",
    "bodyWeight": 300,
    "headingWeight": 400,
    "bodySize": "1.38rem",
    "bodyLineHeight": "1.5",
    "headingLineHeight": "1.125",
    "letterSpacing": "-0.22px",
    "headingLetterSpacing": "-0.1px"
  },
  {
    "id": "type-4",
    "name": "Roboto Slab & Manrope",
    "bodyFamily": "\"TT5 Manrope\", sans-serif",
    "headingFamily": "\"TT5 Roboto Slab\", serif",
    "bodyWeight": 300,
    "headingWeight": 300,
    "bodySize": "1.38rem",
    "bodyLineHeight": "1.4",
    "headingLineHeight": "1.2",
    "letterSpacing": "0",
    "headingLetterSpacing": "-0.5px"
  },
  {
    "id": "type-5",
    "name": "Literata & Ysabeau Office",
    "bodyFamily": "\"TT5 Ysabeau Office\", sans-serif",
    "headingFamily": "\"TT5 Literata\", serif",
    "bodyWeight": 300,
    "headingWeight": 900,
    "bodySize": "1.38rem",
    "bodyLineHeight": "1.4",
    "headingLineHeight": "1.2",
    "letterSpacing": "-0.24px",
    "headingLetterSpacing": "-0.1px"
  },
  {
    "id": "type-6",
    "name": "Platypi & Literata",
    "bodyFamily": "\"TT5 Literata\", serif",
    "headingFamily": "\"TT5 Platypi\", serif",
    "bodyWeight": 300,
    "headingWeight": 800,
    "bodySize": "1.5rem",
    "bodyLineHeight": "1.3",
    "headingLineHeight": "1.125",
    "letterSpacing": "-0.24px",
    "headingLetterSpacing": "-0.1px"
  },
  {
    "id": "type-7",
    "name": "Literata & Fira Sans",
    "bodyFamily": "\"TT5 Fira Sans\", sans-serif",
    "headingFamily": "\"TT5 Literata\", serif",
    "bodyWeight": 300,
    "headingWeight": 200,
    "bodySize": "1rem",
    "bodyLineHeight": "1.5",
    "headingLineHeight": "1.24",
    "letterSpacing": "-0.01em",
    "headingLetterSpacing": "-0.02em"
  }
] as const;

export const styleVariations = [
  {
    "id": "default",
    "name": "Default",
    "paletteId": "default",
    "typographyId": "default"
  },
  {
    "id": "evening",
    "name": "Evening",
    "paletteId": "evening",
    "typographyId": "default"
  },
  {
    "id": "noon",
    "name": "Noon",
    "paletteId": "noon",
    "typographyId": "type-1"
  },
  {
    "id": "dusk",
    "name": "Dusk",
    "paletteId": "dusk",
    "typographyId": "type-2"
  },
  {
    "id": "afternoon",
    "name": "Afternoon",
    "paletteId": "afternoon",
    "typographyId": "type-3"
  },
  {
    "id": "twilight",
    "name": "Twilight",
    "paletteId": "twilight",
    "typographyId": "type-4"
  },
  {
    "id": "morning",
    "name": "Morning",
    "paletteId": "morning",
    "typographyId": "type-5"
  },
  {
    "id": "sunrise",
    "name": "Sunrise",
    "paletteId": "sunrise",
    "typographyId": "type-6"
  },
  {
    "id": "midnight",
    "name": "Midnight",
    "paletteId": "midnight",
    "typographyId": "type-7"
  }
] as const;
