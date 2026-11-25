# Motion Assets

Open **Studio UI Library → Motion Assets** at `/studio/ui/motion-assets`. Browse or search the collection for arrows, shapes, lines and other sketch marks. With **Autoplay on selection** on by default, each sketch plays from the start when you choose it. Use the switch to turn autoplay off. Valid settings update the preview as you edit, including while dragging in the colour spectrum. A built-in sketch’s thumbnail shows its current name, proportions, colour and stroke thickness. You can also preview with **Play** or the position slider. The draft and autoplay setting stay open while you browse other Library tabs.

Each built-in sketch keeps its edits while you browse the catalogue. **Reset Preview** restores the selected sketch’s defaults or the original settings of an opened file. Studio asks before leaving an opened file with unsaved changes.

Press Space to play or pause the preview. Fields and other focused controls keep their usual Space behaviour.

Use the shared **+** and **−** buttons or type directly into a number field. Hold either button to repeat the adjustment. Valid changes update the preview immediately.

Drag inside the sketch’s frame to move it around the preview. Focus the frame and use the arrow keys to move it by 1 px, or hold Shift to move it by 10 px. Escape cancels a drag. **Reset Preview** centres the sketch again. Position applies to the current preview.

Drag an edge or corner handle on the preview to resize the sketch. Resizing keeps the aspect ratio by default. Hold Shift to change width or height independently. With a handle focused, use the arrow keys to resize by 1 px or hold Shift to resize independently by 10 px. Press Escape to cancel a drag. The new dimensions appear in Settings and apply to exports.

The preview frame follows the finished stroke and stays in place during playback. Very thin sketches show fewer handles when space is limited. Width and height fields remain available for both dimensions. Exports use the full canvas and its transparent padding.

**Download Project** saves an editable `.acm-motion.json` file with the original SVG path, its viewBox, and the animation settings. **Open File** reopens it or imports a simple SVG. Studio keeps preview edits in memory. A project file is the way to keep and move your work between sessions or computers.

The initial wave uses the SVG geometry from the November 2026 cross-editor experiment. The collection includes original geometry for the sketch marks. An imported SVG needs a viewBox and one untransformed path. It supports absolute M, L, C and Z commands, with up to 128 segments across all subpaths. Separate strokes draw in path order within the overall draw time. Path and control points must be inside the viewBox. Studio imports the geometry and uses a supported solid stroke colour and whole-pixel thickness if specified directly on the path. Files are limited to 24 KB. Projects with multiple strokes use v0.2.0. Studio still reads and writes v0.1.0 projects for a single stroke.

## Special effects

**Volumetric Fireball** is an independently generated 3D flame effect. Its shell, turbulent folds, sparks, and fade are defined in the [shared shader](../app/studio/motion-assets/volumetric-fireball.glsl). Change its name, width, height, and duration from 0.6 to 15 seconds. Defaults are 1920 × 1080 px and 11.6 seconds at 30 fps. Download an editable project in format v0.5.0 or export a new ProRes 4444 MOV with alpha using **Transparent MOV**.

Studio previews the live shader on the transparency grid through WebGL 2. It shows a rendered still if live preview is unavailable. Local MOV export renders the same shader in Metal at the chosen size and duration. It requires a Mac with Metal, the Swift toolchain, and FFmpeg.

Use **Open File** to edit or export existing **Fire Burst** (v0.3.0) or **Fire Shockwave** (v0.4.0) projects. Fire Shockwave’s artwork took visual inspiration from [JoyRea Effects’ green-screen Short](https://www.youtube.com/shorts/w6MCj9em7J8). If your system requests reduced motion, use **Play** to start an effect manually.

### Render Volumetric Fireball from the command line

From the repository root, run these commands in Bash to render the default size and duration on a Mac with Metal, the Swift toolchain, and FFmpeg installed:

```sh
set -e -o pipefail
render_dir=$(mktemp -d)
mkdir -p outputs
swiftc -O -module-cache-path "$render_dir/module-cache" scripts/volumetric-fireball/render.swift -o "$render_dir/render"
"$render_dir/render" app/studio/motion-assets/volumetric-fireball.glsl 1920 1080 348 | \
  ffmpeg -n -f rawvideo -pixel_format rgba -video_size 1920x1080 -framerate 30 -i pipe:0 \
  -vf 'scale=out_color_matrix=bt709:out_range=tv,format=yuva444p10le' -c:v prores_ks \
  -profile:v 4 -alpha_bits 8 -threads 4 -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -movflags +faststart outputs/volumetric-fireball-render.mov
```

## Sound effects

Find **Explosion and Glass** under **Sound Effects**. Play it in the catalogue or choose **Download WAV** for a 4.1-second stereo clip at 48 kHz and 24-bit PCM. Search for the name or terms such as “shatter” and “blast”.

The sound is synthesised from seeded noise, oscillators, and short stereo reflections. The Camtasia sound informed the timing and character. The generator uses no recording as input. From the repository root, run `node scripts/synthesise-explosion-glass.mjs` to regenerate the bundled WAV.

## Files from your media library

Put audio and video in a top-level **Motion Assets** folder under **Files**. Audio appears under **Sound Effects**, and video appears under **Special Effects**. The catalogue plays the files in this browser, and the download returns the original file. Manage their names and contents in **Files**.

If a MOV needs a browser-compatible preview, put a matching MP4 in a **Previews** subfolder inside **Motion Assets**. For example, `impact.mov` uses `Previews/impact.mp4` for playback and still downloads as `impact.mov`.

Choose **File Details** to see the original audio or video file's size, duration, technical properties, and available embedded tags. Files also offers this panel when an audio or video file is selected. Finder's download history and other macOS-only attributes do not come across when a file is imported into the browser.

## Choose an export

| Export | Use |
| --- | --- |
| SVG | Static final drawing on a transparent canvas. |
| Lottie JSON | Web animation for a Lottie player. |
| Transparent MOV | Video overlay in editors that read ProRes 4444 alpha. |
| WAV | Sound effect for a video editor, website, or app. |

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
