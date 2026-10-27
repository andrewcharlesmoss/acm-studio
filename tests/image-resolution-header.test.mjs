import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { inspectStaticRaster } from "../app/content/raster-dimensions.ts";
import { imageRenditionResourceKey, validImageResolution } from "../app/content/image-resolution.ts";

function webp(chunks) {
  const body = Buffer.concat(chunks.map(([name, bytes]) => {
    const header = Buffer.alloc(8);
    header.write(name, 0, 4, "ascii");
    header.writeUInt32LE(bytes.length, 4);
    return Buffer.concat([header, bytes, bytes.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
  }));
  const header = Buffer.alloc(12);
  header.write("RIFF", 0); header.writeUInt32LE(body.length + 4, 4); header.write("WEBP", 8);
  return Buffer.concat([header, body]);
}

function extended(width, height) {
  const bytes = Buffer.alloc(10);
  bytes.writeUIntLE(width - 1, 4, 3); bytes.writeUIntLE(height - 1, 7, 3);
  return bytes;
}

function lossless(width, height) {
  const bytes = Buffer.alloc(5); bytes[0] = 0x2f;
  bytes.writeUInt32LE((width - 1) | ((height - 1) << 14), 1);
  return bytes;
}

test("predecode inspection identifies real static fixtures and rejects animated PNG", async () => {
  const png = await readFile(new URL("../public/specimens/landscape.png", import.meta.url));
  const jpeg = await readFile(new URL("../public/specimens/mont-blanc.jpg", import.meta.url));
  assert.deepEqual(inspectStaticRaster(png, "image/png"), { width: 640, height: 360, orientation: 1 });
  assert.deepEqual(inspectStaticRaster(jpeg, "image/jpeg"), { width: 500, height: 375, orientation: 1 });
  const animatedChunk = Buffer.from([0, 0, 0, 8, 97, 99, 84, 76, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(inspectStaticRaster(Buffer.concat([png.subarray(0, 33), animatedChunk, png.subarray(33)]), "image/png"), null);
  assert.equal(inspectStaticRaster(Buffer.concat([png.subarray(0, 33), png.subarray(8, 33), png.subarray(33)]), "image/png"), null);
  assert.equal(inspectStaticRaster(png.subarray(0, 30), "image/png"), null);
});

test("predecode inspection rejects conflicting WebP canvases, animation and EXIF", () => {
  const image = ["VP8L", lossless(320, 200)];
  assert.deepEqual(inspectStaticRaster(webp([["VP8X", extended(320, 200)], image]), "image/webp"), { width: 320, height: 200, orientation: 1 });
  assert.equal(inspectStaticRaster(webp([["VP8X", extended(16, 16)], image]), "image/webp"), null);
  assert.equal(inspectStaticRaster(webp([image, image]), "image/webp"), null);
  assert.equal(inspectStaticRaster(webp([image, ["ANIM", Buffer.alloc(6)]]), "image/webp"), null);
  assert.equal(inspectStaticRaster(webp([image, ["EXIF", Buffer.alloc(8)]]), "image/webp"), null);
  const truncated = webp([image]);
  truncated.writeUInt32LE(truncated.length - 9, 4);
  assert.equal(inspectStaticRaster(truncated.subarray(0, -1), "image/webp"), null);
});

test("predecode inspection rejects JPEGs with multiple frame dimensions", () => {
  const frame = Buffer.from([0xff, 0xc0, 0, 8, 8, 0, 10, 0, 20, 0]);
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8]), frame, frame, Buffer.from([0xff, 0xda, 0, 2])]);
  assert.equal(inspectStaticRaster(jpeg, "image/jpeg"), null);
});

test("resolution references require complete digests and resource identities remain distinct", () => {
  const pin = { key: "medium", sourceDigest: "a".repeat(64), renditionDigest: "b".repeat(64) };
  assert.equal(validImageResolution(pin), true);
  assert.equal(validImageResolution({ ...pin, extra: true }), false);
  assert.equal(validImageResolution({ ...pin, sourceDigest: "A".repeat(64) }), false);
  assert.notEqual(imageRenditionResourceKey('a","medium', pin), imageRenditionResourceKey("a", pin));
});
