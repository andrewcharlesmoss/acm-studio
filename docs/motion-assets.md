# Motion Assets

Open **Studio UI Library → Motion Assets** at `/studio/ui/motion-assets`. Browse or search the collection for arrows, shapes, lines and other sketch marks. With **Autoplay on selection** on by default, each sketch plays from the start when you choose it. Use the switch to turn autoplay off. Valid settings update the preview as you edit, including while dragging in the colour spectrum. A built-in sketch’s thumbnail shows its current name, proportions, colour and stroke thickness. You can also preview with **Play** or the position slider. The draft and autoplay setting stay open while you browse other Library tabs.

Each built-in sketch keeps its edits while you browse the catalogue. **Reset Preview** restores the selected sketch’s defaults or the original settings of an opened file. Studio asks before leaving an opened file with unsaved changes.

Drag inside the sketch’s frame to move it around the preview. Focus the frame and use the arrow keys to move it by 1 px, or hold Shift to move it by 10 px. Escape cancels a drag. **Reset Preview** centres the sketch again. Position applies to the current preview.

Drag an edge or corner handle on the preview to resize the sketch. Resizing keeps the aspect ratio by default. Hold Shift to change width or height independently. With a handle focused, use the arrow keys to resize by 1 px or hold Shift to resize independently by 10 px. Press Escape to cancel a drag. The new dimensions appear in Settings and apply to exports.

**Download Project** saves an editable `.acm-motion.json` file with the original SVG path, its viewBox, and the animation settings. **Open File** reopens it or imports a simple SVG. Studio keeps preview edits in memory. A project file is the way to keep and move your work between sessions or computers.

The initial wave uses the SVG geometry from the November 2026 cross-editor experiment. The collection includes original geometry for the sketch marks. An imported SVG needs a viewBox and one untransformed path. It supports absolute M, L, C and Z commands, with up to 128 segments across all subpaths. Separate strokes draw in path order within the overall draw time. Path and control points must be inside the viewBox. Studio imports the geometry and uses a supported solid stroke colour and whole-pixel thickness if specified directly on the path. Files are limited to 24 KB. Projects with multiple strokes use v0.2.0. Studio still reads and writes v0.1.0 projects for a single stroke.

## Choose an export

| Export | Use |
| --- | --- |
| SVG | Static final drawing on a transparent canvas. |
| Lottie JSON | Web animation for a Lottie player. |
| Transparent MOV | Video overlay in editors that read ProRes 4444 alpha. |

Templates start at 800 × 800 px, with a one-second reveal and two-second hold. Exports use 30 fps. The first release supports up to 1920 × 1080 px in landscape or 1080 × 1920 px in portrait, and up to 10 seconds including the hold. The canvas has a fixed inset so changing the stroke thickness leaves the geometry in place.

MOV requires the local Studio development server and an FFmpeg installation on its process PATH. Check `ffmpeg -h encoder=prores_ks` for `yuva444p10le` and `alpha_bits`. Restart local Studio if you install FFmpeg or change its PATH. Hosted Studio supports projects, SVG, and Lottie in the browser. When MOV is available, place the clip on a track above your footage. The exported animation and its settings will play as rendered.

## Play Lottie on a website

With `lottie-web` installed in your website project, place the matching Lottie JSON and SVG exports in its public media directory. This example starts with the SVG and only replaces it when the player is ready. It restores the SVG when the visitor enables reduced motion. The example is decorative. If the art conveys information, provide an accessible description instead.

```html
<div id="sketch-motion" aria-hidden="true" style="aspect-ratio: 1;">
  <img src="/media/wave.svg" alt="" style="width: 100%; height: 100%;">
</div>
```

```js
import lottie from "lottie-web";

const container = document.querySelector("#sketch-motion");
const poster = container.querySelector("img");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let animation;

function updateMotion() {
  animation?.destroy();
  animation = undefined;
  container.replaceChildren(poster);
  if (reducedMotion.matches) return;

  const layer = document.createElement("div");
  layer.style.cssText = "display:none;width:100%;height:100%";
  container.append(layer);
  const player = lottie.loadAnimation({
    container: layer,
    renderer: "svg",
    path: "/media/wave.lottie.json",
    autoplay: false,
    loop: false,
  });
  animation = player;
  player.addEventListener("DOMLoaded", () => {
    if (animation !== player) return;
    poster.remove();
    layer.style.display = "";
    player.play();
  });
}

reducedMotion.addEventListener("change", updateMotion);
updateMotion();
```

Set the aspect ratio to the exported width divided by the height. In a component that can unmount, remove the media query listener and destroy the player during cleanup.
