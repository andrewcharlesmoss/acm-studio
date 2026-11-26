import Foundation
import Metal

struct FrameParameters {
    let width: UInt32
    let height: UInt32
    let time: Float
    let softFade: UInt32
    let settings: SIMD4<Float>
}

enum RenderError: Error { case invalidArguments, metalUnavailable, renderFailed }

var args = CommandLine.arguments
let fadeFlag = args.firstIndex(of: "--soft-fade")
var settings = SIMD4<Float>(0, 0.48, 0.12, 1)
if let flag = fadeFlag {
    let values = args.suffix(from: flag + 1)
    if !values.isEmpty {
        let numbers = values.compactMap { Int($0) }
        guard values.count == 4, numbers.count == 4,
              numbers.prefix(3).allSatisfy({ (0...100).contains($0) }),
              (20...180).contains(numbers[3]) else { throw RenderError.invalidArguments }
        settings = SIMD4<Float>(Float(numbers[0]), Float(numbers[1]), Float(numbers[2]), Float(numbers[3])) / 100
    }
    args.removeSubrange(flag...)
}
guard (5...6).contains(args.count), let width = Int(args[2]), let height = Int(args[3]),
      let frames = Int(args[4]), (1...1920).contains(width), (1...1920).contains(height), (2...600).contains(frames)
else {
    FileHandle.standardError.write(Data("Usage: render shader.glsl width height frame-count [single-frame-index] [--soft-fade [fade-in% fade-out% flame-motion% coverage%]]\n".utf8))
    throw RenderError.invalidArguments
}

let selectedFrames: Range<Int>
if args.count == 6 {
    guard let index = Int(args[5]), (0..<frames).contains(index) else { throw RenderError.invalidArguments }
    selectedFrames = index..<(index + 1)
} else {
    selectedFrames = 0..<frames
}

let byteCount = width * height * 4
guard let device = MTLCreateSystemDefaultDevice(), let queue = device.makeCommandQueue(),
      let buffer = device.makeBuffer(length: byteCount, options: .storageModeShared)
else { throw RenderError.metalUnavailable }
let sourceURL = URL(fileURLWithPath: args[1])
let commonURL = sourceURL.deletingLastPathComponent().appendingPathComponent("fireball-noise.glsl")
let common = try String(contentsOf: commonURL, encoding: .utf8)
let shader = try String(contentsOf: sourceURL, encoding: .utf8)
let fadeURL = sourceURL.deletingLastPathComponent().appendingPathComponent("fireball-fade.glsl")
let fade = try String(contentsOf: fadeURL, encoding: .utf8)
let metalSource = """
#include <metal_stdlib>
using namespace metal;
#define vec2 float2
#define vec3 float3
#define vec4 float4
#define ivec2 int2
#define ivec3 int3

\(common)
\(shader)
\(fade)

struct FrameParameters { uint width; uint height; float time; uint softFade; float4 settings; };

kernel void renderFireball(device uchar4 *output [[buffer(0)]],
                           constant FrameParameters &frame [[buffer(1)]],
                           uint2 pixel [[thread_position_in_grid]]) {
    if (pixel.x >= frame.width || pixel.y >= frame.height) return;
    float2 uv = (float2(pixel) + 0.5f) / float2(frame.width, frame.height);
    float4 colour = fireballWithFade(uv, float(frame.width) / float(frame.height), frame.time, frame.softFade != 0u, frame.settings);
    output[pixel.y * frame.width + pixel.x] = uchar4(saturate(colour) * 255.0f + 0.5f);
}
"""
let library = try device.makeLibrary(source: metalSource, options: nil)
guard let function = library.makeFunction(name: "renderFireball") else { throw RenderError.metalUnavailable }
let pipeline = try device.makeComputePipelineState(function: function)
let threadWidth = pipeline.threadExecutionWidth
let threadHeight = min(8, pipeline.maxTotalThreadsPerThreadgroup / threadWidth)

for index in selectedFrames {
    guard let command = queue.makeCommandBuffer(), let encoder = command.makeComputeCommandEncoder()
    else { throw RenderError.renderFailed }
    var frame = FrameParameters(width: UInt32(width), height: UInt32(height), time: Float(index) / Float(frames - 1), softFade: fadeFlag != nil ? 1 : 0, settings: settings)
    encoder.setComputePipelineState(pipeline)
    encoder.setBuffer(buffer, offset: 0, index: 0)
    encoder.setBytes(&frame, length: MemoryLayout<FrameParameters>.stride, index: 1)
    encoder.dispatchThreads(MTLSize(width: width, height: height, depth: 1),
        threadsPerThreadgroup: MTLSize(width: threadWidth, height: threadHeight, depth: 1))
    encoder.endEncoding()
    command.commit()
    command.waitUntilCompleted()
    guard command.status == .completed else { throw command.error ?? RenderError.renderFailed }
    try FileHandle.standardOutput.write(contentsOf: Data(bytesNoCopy: buffer.contents(), count: byteCount, deallocator: .none))
}
