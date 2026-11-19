# Motion Assets

Open **Studio UI Library → Motion Assets** at `/studio/ui/motion-assets`. The Studio dashboard and Tools navigation also link to this tab. Choose **Use Wave** or **Use Circle**, then set the canvas dimensions, stroke colour, thickness, draw time, and hold time. Press Enter or leave a number field to apply it. Use **Play** or the position slider to check the reveal against the transparent canvas. The draft stays open while you browse other Library tabs.

**Download Project** saves an editable `.acm-motion.json` file with the original SVG path, its viewBox, and the animation settings. **Open File** reopens it or imports a simple SVG. Studio keeps the current project in memory. A project file is the way to keep and move your work between sessions or computers.

The initial wave uses the SVG geometry from the November 2026 cross-editor experiment. The circle is an original cubic Bézier preset. An imported SVG needs a viewBox and one untransformed path. Its supported path commands are absolute M, L, C, and Z in one subpath, with up to 128 segments. Path and control points must be inside the viewBox. Studio imports the geometry and uses a supported solid stroke colour and whole-pixel thickness if specified directly on the path. Files are limited to 24 KB.

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
