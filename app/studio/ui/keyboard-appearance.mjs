export const KEYBOARD_APPEARANCE_PRESETS = Object.freeze({
  default: Object.freeze({
    colour: "#1C1C1E",
    borderColour: "#1C1C1E",
    fillColour: "#F2F2F7",
    matchBorder: true,
    transparent: false,
    dark: false,
  }),
  dark: Object.freeze({
    colour: "#F2F2F7",
    borderColour: "#F2F2F7",
    fillColour: "#1C1C1E",
    matchBorder: true,
    transparent: false,
    dark: true,
  }),
  outline: Object.freeze({
    colour: "#1C1C1E",
    borderColour: "#1C1C1E",
    fillColour: "#F2F2F7",
    matchBorder: true,
    transparent: true,
    dark: false,
  }),
});

export function createKeyboardCatalogueState() {
  return {
    selected: "command",
    platform: "all",
    mode: "keycap",
    height: 128,
    appearance: { ...KEYBOARD_APPEARANCE_PRESETS.default },
    resetRevision: 0,
    status: "",
  };
}

export function getKeyboardAppearancePreset(name) {
  return KEYBOARD_APPEARANCE_PRESETS[name];
}

export function getKeyboardAppearancePresetName(appearance) {
  for (const [name, preset] of Object.entries(KEYBOARD_APPEARANCE_PRESETS)) {
    if (Object.keys(preset).every((key) => appearance[key] === preset[key])) return name;
  }
  return "custom";
}

export function getKeyboardColourControlKey(name, resetRevision) {
  return `${name}-${resetRevision}`;
}

export function keyboardCatalogueReducer(state, action) {
  switch (action.type) {
    case "select-key":
      return { ...state, selected: action.value, status: "" };
    case "set-platform":
      return { ...state, platform: action.value, status: "" };
    case "set-mode":
      return { ...state, mode: action.value, status: "" };
    case "set-height":
      return { ...state, height: action.value, status: "" };
    case "set-preset": {
      const preset = getKeyboardAppearancePreset(action.value);
      return preset ? { ...state, appearance: { ...preset }, status: "" } : state;
    }
    case "update-appearance":
      return { ...state, appearance: { ...state.appearance, ...action.changes }, status: "" };
    case "set-symbol-colour":
      return {
        ...state,
        appearance: {
          ...state.appearance,
          colour: action.value,
          ...(state.appearance.matchBorder ? { borderColour: action.value } : {}),
        },
        status: "",
      };
    case "set-border-match":
      return {
        ...state,
        appearance: { ...state.appearance, matchBorder: action.value, borderColour: state.appearance.colour },
        status: "",
      };
    case "reset-appearance":
      return {
        ...state,
        appearance: { ...KEYBOARD_APPEARANCE_PRESETS.default },
        resetRevision: state.resetRevision + 1,
        status: "Colours reset to default.",
      };
    case "set-status":
      return { ...state, status: action.value };
    default:
      return state;
  }
}
