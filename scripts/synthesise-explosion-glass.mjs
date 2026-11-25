import { mkdirSync, writeFileSync } from "node:fs";

const rate = 48_000;
const frames = Math.round(4.1 * rate);
const left = new Float32Array(frames);
const right = new Float32Array(frames);
const tau = 2 * Math.PI;
let seed = 0x4283bc61;

function noise() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 0x80000000 - 1;
}

function filter(mode, frequency, q = Math.SQRT1_2) {
  const w = tau * frequency / rate;
  const cosine = Math.cos(w);
  const width = Math.sin(w) / (2 * q);
  const scale = 1 / (1 + width);
  const gain = (mode === "lowpass" ? 1 - cosine : 1 + cosine) * scale / 2;
  const middle = mode === "lowpass" ? 2 * gain : -2 * gain;
  const a = -2 * cosine * scale;
  const b = (1 - width) * scale;
  let previous = 0;
  let older = 0;
  return input => {
    const output = gain * input + previous;
    previous = middle * input - a * output + older;
    older = gain * input - b * output;
    return output;
  };
}

const sub = filter("lowpass", 122);
const removeDc = filter("highpass", 21);
const body = filter("lowpass", 410);
const grit = filter("highpass", 340);
const air = filter("lowpass", 3400);
const fracture = filter("highpass", 3100);
const brittle = filter("lowpass", 12300);
const blast = Math.round(0.044 * rate);

for (let frame = blast; frame < frames; frame++) {
  const time = (frame - blast) / rate;
  const attack = 1 - Math.exp(-time / 0.007);
  const subPhase = tau * (43 * time + 8.4 * (1 - Math.exp(-time / 0.14)));
  const pressure = 0.34 * Math.sin(subPhase) * attack * Math.exp(-time / 0.135);
  const sample = noise();
  const roll = 0.76 + 0.14 * Math.sin(tau * 7.3 * time) + 0.10 * Math.sin(tau * 17.9 * time);
  const bass = removeDc(sub(sample)) * 4.7 * attack * roll *
    (0.75 * Math.exp(-time / 0.57) + 0.25 * Math.exp(-time / 1.12));
  const debris = body(noise()) * 1.2 * attack * Math.exp(-time / 0.46);
  const wave = air(grit(sample)) * attack * (0.8 * Math.exp(-time / 0.038) + 0.19 * Math.exp(-time / 0.53));
  const glass = brittle(fracture(sample)) * attack * (0.19 * Math.exp(-time / 0.06) + 0.047 * Math.exp(-time / 0.42));
  const centre = pressure + bass + debris + wave + glass;
  left[frame] = centre;
  right[frame] = centre;
}

// Short, inharmonic resonances and noisy attacks model separate pieces of glass.
function addShard(time, level, pitch, pan, decay) {
  const start = Math.round(time * rate);
  const end = Math.min(frames, start + Math.ceil(6 * decay * rate));
  const leftGain = Math.sqrt(0.5 - pan * 0.45);
  const rightGain = Math.sqrt(0.5 + pan * 0.45);
  const modes = [1, 1.49, 2.17, 3.08];
  const shape = filter("highpass", 1900);
  for (let frame = start; frame < end; frame++) {
    const age = (frame - start) / rate;
    let modesSum = 0;
    for (const [index, ratio] of modes.entries()) {
      modesSum += Math.sin(tau * pitch * ratio * age) *
        Math.exp(-age * ratio / decay) / (1 + index);
    }
    const strike = (1 - Math.exp(-age / 0.00035)) * level;
    const sound = strike * (0.57 * modesSum + 0.36 * shape(noise()) * Math.exp(-age / 0.006));
    left[frame] += leftGain * sound;
    right[frame] += rightGain * sound;
  }
}

addShard(0.047, 0.36, 1840, 0.08, 0.038);
addShard(0.081, 0.25, 2630, -0.44, 0.039);
addShard(0.113, 0.23, 3200, 0.62, 0.026);
for (let i = 0; i < 58; i++) {
  const time = 0.065 + 1.32 * ((noise() + 1) / 2) ** 2.4;
  addShard(time, (0.028 + 0.024 * noise()) * Math.exp(-time / 0.68), 2350 + 1280 * noise(),
    noise(), 0.022 + 0.014 * noise());
}
for (const [time, level, pitch, pan] of [
  [0.29, 0.10, 2917, 0.65], [0.48, 0.11, 1473, -0.68], [0.69, 0.074, 2281, 0.65],
  [0.97, 0.065, 1986, 0.58], [1.19, 0.055, 2507, -0.71], [1.44, 0.041, 1751, -0.3],
  [1.62, 0.030, 2745, 0.8], [1.95, 0.018, 2193, -0.72], [2.29, 0.010, 1897, 0.65],
  [2.61, 0.007, 2400, -0.3],
]) {
  addShard(time, level, pitch, pan, 0.035);
}

// Crossfed reflections spread the impact in stereo without losing the centred bass.
for (const [channel, other, delays] of [
  [left, right, [[0.031, 0.16], [0.087, 0.095], [0.154, 0.074], [0.32, 0.041]]],
  [right, left, [[0.046, 0.17], [0.106, 0.106], [0.184, 0.073], [0.36, 0.038]]],
]) {
  for (let frame = frames - 1; frame >= 0; frame--) {
    for (const [delay, gain] of delays) {
      const source = frame - Math.round(delay * rate);
      if (source >= 0) channel[frame] += other[source] * gain;
    }
  }
}

const wav = Buffer.alloc(44 + frames * 6);
wav.write("RIFF");
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 6, 28);
wav.writeUInt16LE(6, 32);
wav.writeUInt16LE(24, 34);
wav.write("data", 36);
wav.writeUInt32LE(wav.length - 44, 40);

let peak = 0;
for (let frame = 0; frame < frames; frame++) {
  peak = Math.max(peak, Math.abs(left[frame]), Math.abs(right[frame]));
}
const drive = 1.35 / peak;
const volume = 10 ** (-4.5 / 20) / Math.tanh(1.35);
for (let frame = 0; frame < frames; frame++) {
  const fade = Math.min(1, (frames - 1 - frame) / (rate * 0.35));
  const scale = 0x7fffff * volume * fade;
  wav.writeIntLE(Math.round(Math.tanh(left[frame] * drive) * scale), 44 + frame * 6, 3);
  wav.writeIntLE(Math.round(Math.tanh(right[frame] * drive) * scale), 47 + frame * 6, 3);
}

const directory = new URL("../public/motion-assets/", import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(new URL("explosion-and-glass.wav", directory), wav);
