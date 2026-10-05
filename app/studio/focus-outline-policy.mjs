export function focusOutlineVisible(mode, modality) {
  return mode === "on" || (mode === "keyboard" && modality === "keyboard");
}

/** Studio document scope includes portals and is removed outside Studio. */
export function installStudioFocusPolicy(document, initialMode = "keyboard") {
  const root = document.documentElement;
  const names = ["data-studio-focus-mode", "data-studio-focus-visible"];
  const previous = names.map(name => root.getAttribute(name));
  let mode = initialMode;
  let modality = "pointer";
  function apply() {
    root.setAttribute(names[0], mode);
    root.setAttribute(names[1], String(focusOutlineVisible(mode, modality)));
  }
  function keyboard(event) {
    if (["Shift", "Control", "Alt", "Meta"].includes(event.key)) return;
    modality = "keyboard";
    apply();
  }
  function pointer() { modality = "pointer"; apply(); }
  document.addEventListener("keydown", keyboard, true);
  document.addEventListener("pointerdown", pointer, true);
  apply();
  return {
    setMode(next) { mode = next; apply(); },
    dispose() {
      document.removeEventListener("keydown", keyboard, true);
      document.removeEventListener("pointerdown", pointer, true);
      names.forEach((name, index) => {
        if (previous[index] === null) root.removeAttribute(name);
        else root.setAttribute(name, previous[index]);
      });
    },
  };
}
