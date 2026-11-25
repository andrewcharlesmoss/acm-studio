"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { MotionEffect } from "./motion-asset";
import fireballSource from "./volumetric-fireball.glsl?raw";
import poster from "./volumetric-fireball-poster.png?url";

export { poster as volumetricFireballPoster };

const vertexSource = `#version 300 es
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

// Metal uses the same shader functions with native vector type aliases.
const fragmentSource = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 resolution;
uniform float aspect;
uniform float phase;
out vec4 colour;
${fireballSource.replace(/(\d)f\b/g, "$1")}
void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  colour = fireballAt(vec2(uv.x, 1.0 - uv.y), aspect, phase);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function createRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false, antialias: false, depth: false });
  if (!gl) return null;
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (program && vertex && fragment) {
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!program || !gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  const resolution = gl.getUniformLocation(program, "resolution");
  const aspect = gl.getUniformLocation(program, "aspect");
  const phase = gl.getUniformLocation(program, "phase");
  return {
    draw(width: number, height: number, assetAspect: number, assetPhase: number) {
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.uniform2f(resolution, width, height);
      gl.uniform1f(aspect, assetAspect);
      gl.uniform1f(phase, assetPhase);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() { gl.deleteProgram(program); },
  };
}

export function VolumetricFireballCanvas({ asset, frame, playing }: { asset: MotionEffect; frame: number; playing: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<ReturnType<typeof createRenderer>>(null);
  const [unavailable, setUnavailable] = useState(false);

  useLayoutEffect(() => {
    const surface = canvas.current;
    if (!surface) return;
    try { renderer.current = createRenderer(surface); } catch { renderer.current = null; }
    if (!renderer.current) setUnavailable(true);
    const handleLoss = () => setUnavailable(true);
    surface.addEventListener("webglcontextlost", handleLoss);
    return () => {
      surface.removeEventListener("webglcontextlost", handleLoss);
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);

  const { width, height, durationFrames } = asset;
  useLayoutEffect(() => {
    // Playback stays responsive while still using the full volumetric shading model.
    const scale = Math.min(1, (playing ? 420 : 680) / Math.max(width, height));
    renderer.current?.draw(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)),
      width / height, Math.min(1, frame / (durationFrames - 1)));
  }, [durationFrames, frame, height, playing, width]);

  return <div className="motion-fireball-render">
    <div className="motion-fireball-artwork" role="img" aria-label={`${asset.name} animation preview`}
      data-preview-width={width} data-preview-height={height} data-live-render={!unavailable}>
      <canvas ref={canvas} aria-hidden="true" hidden={unavailable} />
      {/* eslint-disable-next-line @next/next/no-img-element -- This bundled poster also works without WebGL. */}
      {unavailable ? <img src={poster} alt="" width={320} height={180} /> : null}
    </div>
    {unavailable ? <span role="status">Live preview requires WebGL 2.</span> : null}
  </div>;
}
