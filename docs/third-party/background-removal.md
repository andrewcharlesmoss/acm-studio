# Local background removal

Source and licence review: 15 September 2026. This is a local prototype, not a
claim of Canva-equivalent quality or a published release.

## Selected models and runtime

| Component | Version or revision | Licence | Purpose |
| --- | --- | --- | --- |
| U²-Net full ONNX | `Heliosoph/u2net-onnx` at `7fc34deee10329bc039c10a73b98090d0c6f5c59` | Apache 2.0 | Default General mode: salient people, animals and objects |
| MODNet photographic portrait ONNX | `onnx-community/modnet-webnn` at `6af52070d14deafc5e55ce6cc4d752a322cdff76` | Apache 2.0 | Optional People mode: portrait matting |
| ONNX Runtime Web | `1.30.0`, pinned npm dependency | MIT | Local, single-thread WebAssembly inference in a dedicated worker |

The [U²-Net upstream repository](https://github.com/xuebinqin/U-2-Net) provides
the salient-object model and Apache 2.0 licence. The
[ONNX model card](https://huggingface.co/Heliosoph/u2net-onnx/tree/7fc34deee10329bc039c10a73b98090d0c6f5c59)
identifies the original weights and rembg conversion; its full ONNX file has
SHA-256 `8d10d2f3bb75ae3b6d527c77944fc5e7dcd94b29809d47a739a7a728a912b491`
and 175,997,641 bytes. This is the general saliency model, **not** the
APDrawing portrait-sketch variant. Preprocessing follows the
[rembg U²-Net session](https://github.com/danielgatis/rembg/blob/main/rembg/sessions/u2net.py)
and its base normalisation: 320 × 320 RGB, normalise by the maximum RGB
sample, ImageNet mean/std, fused first output, then min/max mask normalisation.
Canvas resizing replaces rembg's Pillow resizing; results need not be identical.

[MODNet upstream](https://github.com/ZHKKKe/MODNet#license) explicitly releases
its code, models and demos under Apache 2.0 (excluding its GIF examples).
The [ONNX conversion](https://huggingface.co/onnx-community/modnet-webnn/tree/6af52070d14deafc5e55ce6cc4d752a322cdff76)
uses the same licence. Its FP32 model is 25,888,640 bytes with SHA-256
`07c308cf0fc7e6e8b2065a12ed7fc07e1de8febb7dc7839d7b7f15dd66584df9`.
We adapt the [official photographic ONNX inference](https://github.com/ZHKKKe/MODNet/blob/master/onnx/inference_onnx.py):
RGB NCHW, mean/std 0.5, 512px short-edge reference and multiples of 32.
We cap the long edge at 1024 to bound memory for extreme aspect ratios.

[ONNX Runtime's MIT licence](https://github.com/microsoft/onnxruntime/blob/v1.30.0/LICENSE)
and both model licence texts are retained under `public/licences/` and ship
with the app. Model architecture/weights are not modified or redistributed
in this repository; pinned downloads are checked for exact length and SHA-256
before inference. The application adds preprocessing, alpha cleanup and local
editor integration. Maintain these notices when distributing the app.

## Choice and limitations

U²-Net was selected for a general-object browser CPU path with a bounded
320 × 320 inference tensor. MODNet's much smaller download and portrait-specific
matting are useful as an explicit alternative, but it cannot replace a general
model. The supplied portrait preserved the face and dark shirt in both modes;
General gave the tighter visible outline before cleanup. Neither model is
guaranteed to identify the intended subject in every image. Fine fur, spokes,
glass transparency and background-coloured fringes remain difficult.

Local browser checks with General and the default 10% Edge Cleanup found:

- The supplied portrait retains the face and dark shirt, with a substantial
  improvement over colour flooding, but a thin cyan fringe remains around
  parts of the shoulders and hair.
- A tiger photograph retains the animal's body; this is general-animal
  evidence, not a domestic-cat benchmark.
- A bicycle retains its frame and wheels but loses fine spokes and retains
  some background inside the rear wheel.
- A glass retains its outer silhouette but also retains background colour
  through the bowl. This is not accurate transparent-material matting.

These results do not establish Canva parity. Cleanup adjusts the matte, not
colour contamination; increasing it cannot reliably repair missing fine
structures or recover the true colour/transparency of glass.

[BiRefNet lite](https://huggingface.co/onnx-community/BiRefNet_lite-ONNX) was
considered: its MIT licence is suitable, but its available FP32 ONNX model is
224 MB and processes 1024 × 1024 inputs. It was not selected for this CPU-first
implementation. BRIA RMBG models require separate commercial terms, and the
IMG.LY background-removal package uses AGPL/commercial licensing; neither is
an assumed drop-in dependency for ACM Studio.

## Runtime, privacy and recovery

- Only public model bytes are downloaded from Hugging Face and its CDN. The
  image is decoded and processed in a local worker; it is never uploaded.
- Runtime JavaScript and WASM are copied verbatim from the pinned npm package
  by `scripts/prepare-background-runtime.mjs` during `predev` and `prebuild`.
  Generated files are ignored and served from the same origin. This avoids a
  Vite development rewrite that injects a DOM-only HMR client into the worker.
- No WebGPU, account, API key, cross-origin isolation or server inference is
  required. Browser HTTP caching may reuse downloads; offline availability is
  not guaranteed. There is no new application-managed image or model cache.
- One job owns one worker. Cancel, edits, selection changes, unmount and write
  ownership loss invalidate the job. A 180-second timeout terminates it. Model
  errors leave the design unchanged and permit another explicit attempt.
- Images are limited to 16 megapixels. The output uses original dimensions,
  multiplies the predicted alpha by existing image alpha and preserves all
  object transforms/crop. Canvas premultiplication can round RGB values at
  translucent pixels; byte-exact output colour preservation is not promised.
- Edge Cleanup remaps only the predicted alpha; it never flood-fills colours.
  Raising it suppresses fringes but can remove fine hair. Each rerun starts
  from the original. Source images are never overwritten.
- `DesignAsset.sourceAssetId` is an optional, backwards-compatible v1 field.
  It must point directly to an existing original, not another derivative.
  Save compaction retains that original while a derivative is referenced.
  Restore Original is undoable; regular Undo/Redo restores the complete design.
  Browser-storage quota failures remain visible and editable backups remain
  available. Original data remains private within those backups.

## Verification

From the repository root, run `npm test`, `npm run typecheck`, `npm run lint`
and `git diff --check`. `npm test` includes the production build, including
runtime preparation. Browser verification must use actual inference and inspect
the transparent output on contrasting backgrounds. Also exercise crop/rotation,
undo/redo, reload/Restore Original, cancellation, edits during inference, download
failure and a second tab's write exclusion. Test representative desktop, tablet
and mobile controls. Keep personal portraits and generated test outputs in the
ignored `work/` directory; never add them to the published assets or Git.
