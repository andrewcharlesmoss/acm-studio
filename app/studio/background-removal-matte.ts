/** MODNet's RGB, NCHW input contract; keep image processing independent of the runtime. */
export function portraitInputSize(width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || width * height > 16_000_000) {
    throw new Error("Background removal supports images up to 16 megapixels.");
  }
  // Match the photographic model's 512px reference, with a 1024px long-edge
  // ceiling so unusually wide images cannot allocate unbounded inference tensors.
  const scale = Math.min(512 / Math.min(width, height), 1024 / Math.max(width, height));
  return { width: Math.max(32, Math.floor(width * scale / 32) * 32), height: Math.max(32, Math.floor(height * scale / 32) * 32) };
}

export function normalisePortraitPixels(rgba: Uint8ClampedArray) {
  const count = rgba.length / 4;
  const tensor = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    for (let channel = 0; channel < 3; channel++) tensor[channel * count + index] = rgba[index * 4 + channel] / 127.5 - 1;
  }
  return tensor;
}

export function normaliseSubjectPixels(rgba: Uint8ClampedArray) {
  const count = rgba.length / 4;
  const tensor = new Float32Array(count * 3);
  const mean = [.485, .456, .406];
  const std = [.229, .224, .225];
  // Match rembg's U²-Net preprocessing; alpha is not a colour sample.
  let maximum = 1;
  for (let index = 0; index < rgba.length; index++) if (index % 4 !== 3) maximum = Math.max(maximum, rgba[index]);
  for (let index = 0; index < count; index++) {
    for (let channel = 0; channel < 3; channel++) tensor[channel * count + index] = (rgba[index * 4 + channel] / maximum - mean[channel]) / std[channel];
  }
  return tensor;
}

export function normaliseSubjectMask(matte: Float32Array) {
  let minimum = Infinity;
  let maximum = -Infinity;
  for (const value of matte) {
    if (!Number.isFinite(value)) throw new Error("The background removal model returned an invalid mask.");
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  if (maximum - minimum < 1e-6) throw new Error("No distinct subject was detected. Try an image with a clearer foreground.");
  return matte.map(value => (value - minimum) / (maximum - minimum));
}

export function portraitMaskPixels(matte: Float32Array, count: number, edgeCleanup = 0) {
  if (!Number.isFinite(edgeCleanup) || edgeCleanup < 0 || edgeCleanup > .4) throw new Error("Choose an edge cleanup value between 0 and 40%.");
  if (matte.length !== count) throw new Error("The portrait model returned an invalid mask.");
  const rgba = new Uint8ClampedArray(count * 4);
  let foreground = 0;
  for (let index = 0; index < count; index++) {
    if (!Number.isFinite(matte[index])) throw new Error("The portrait model returned an invalid mask.");
    const alpha = Math.round(Math.max(0, Math.min(1, (matte[index] - edgeCleanup) / (1 - edgeCleanup))) * 255);
    if (alpha > 127) foreground++;
    rgba[index * 4] = rgba[index * 4 + 1] = rgba[index * 4 + 2] = 255;
    rgba[index * 4 + 3] = alpha;
  }
  if (!foreground) throw new Error("No distinct subject was detected. Try an image with a clearer foreground.");
  return rgba;
}
