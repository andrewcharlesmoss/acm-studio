import { motionPreset, type MotionAsset } from "./motion-asset.ts";

const paths = [
  ["Line", "M35 210 L385 210"],
  ["Underline", "M35 260 C130 235 290 235 385 260"],
  ["Arch", "M35 310 C45 60 375 60 385 310"],
  ["Curve", "M35 320 C40 90 360 330 385 100"],
  ["Zigzag", "M35 310 L120 110 L205 310 L290 110 L385 310"],
  ["Check", "M55 215 L165 325 L365 95"],
  ["Chevron", "M100 70 L300 210 L100 350"],
  ["Arrow", "M35 210 L375 210 L270 105 L375 210 L270 315"],
  ["Triangle", "M210 35 L385 375 L35 375 Z"],
  ["Rectangle", "M45 95 L375 95 L375 325 L45 325 Z"],
  ["Diamond", "M210 30 L385 210 L210 390 L35 210 Z"],
  ["Star", "M210 30 L256 165 L395 165 L282 250 L325 385 L210 302 L95 385 L138 250 L25 165 L164 165 Z"],
] as const;

export const motionCatalogue: MotionAsset[] = [
  motionPreset("wave"),
  motionPreset("circle"),
  ...paths.map(([name, path]) => ({ ...motionPreset("wave"), name, path })),
];
