import SwiftUI
#if os(macOS)
import AppKit
#endif
import XCTest
@testable import ACMReorder

final class VerticalReorderTests: XCTestCase {
    let ids = ["a", "b", "c"]
    let frames: [String: CGRect] = ["a": CGRect(x: 10, y: 20, width: 100, height: 20), "b": CGRect(x: 10, y: 50, width: 100, height: 40), "c": CGRect(x: 10, y: 100, width: 100, height: 20)]
    let viewport = CGRect(x: 0, y: 0, width: 120, height: 140)

    func testCandidateNoOpOutsideAndEndSlots() {
        func candidate(_ x: CGFloat, _ y: CGFloat) -> Int? { VerticalPlacement.candidate(ids: ids, source: "b", frames: frames, viewport: viewport, point: CGPoint(x: x, y: y)) }
        XCTAssertEqual(candidate(30, 16), 0)
        XCTAssertEqual(candidate(30, 124), 3)
        XCTAssertNil(candidate(30, 45))
        XCTAssertNil(candidate(30, 95))
        XCTAssertNil(candidate(119, 16))
        XCTAssertNil(candidate(30, 9))
        XCTAssertNil(VerticalPlacement.candidate(ids: ["a", "a"], source: "a", frames: frames, viewport: viewport, point: CGPoint(x: 30, y: 20)))
    }

    func testLineCentresInteriorAndReservedEnds() throws {
        XCTAssertEqual(try XCTUnwrap(VerticalPlacement.line(ids: ids, gap: 1, frames: frames, viewport: viewport)).minY, 45)
        XCTAssertEqual(try XCTUnwrap(VerticalPlacement.line(ids: ids, gap: 2, frames: frames, viewport: viewport)).minY, 95)
        XCTAssertEqual(try XCTUnwrap(VerticalPlacement.line(ids: ids, gap: 0, frames: frames, viewport: viewport)).minY, 16)
        XCTAssertEqual(try XCTUnwrap(VerticalPlacement.line(ids: ids, gap: 3, frames: frames, viewport: viewport)).minY, 124)
        XCTAssertNil(VerticalPlacement.line(ids: ids, gap: 2, frames: ["a": frames["a"]!], viewport: viewport))
    }

#if os(macOS)
    func testMacArrowFlagsAllowFunctionAndKeypadButRejectOtherModifiers() {
        XCTAssertEqual(ReorderKeyboard.macDirection(keyCode: 125, modifiers: [.option, .numericPad, .function]), 1)
        XCTAssertEqual(ReorderKeyboard.macDirection(keyCode: 126, modifiers: [.option, .function]), -1)
        XCTAssertNil(ReorderKeyboard.macDirection(keyCode: 125, modifiers: [.option, .shift]))
        XCTAssertNil(ReorderKeyboard.macDirection(keyCode: 125, modifiers: []))
        XCTAssertNil(ReorderKeyboard.macDirection(keyCode: 0, modifiers: [.option]))
    }
#endif

    func testKeyboardGapMatchesPointerAndRespectsBounds() {
        let down = ReorderKeyboard.move(id: "b", ids: ids, direction: 1)
        XCTAssertEqual(down?.0, 1); XCTAssertEqual(down?.1, 3)
        let up = ReorderKeyboard.move(id: "b", ids: ids, direction: -1)
        XCTAssertEqual(up?.0, 1); XCTAssertEqual(up?.1, 0)
        XCTAssertNil(ReorderKeyboard.move(id: "a", ids: ids, direction: -1))
        XCTAssertNil(ReorderKeyboard.move(id: "c", ids: ids, direction: 1))
        XCTAssertNil(ReorderKeyboard.move(id: "b", ids: ids, direction: 1, accepts: { _, _ in false }))
        XCTAssertNil(ReorderKeyboard.move(id: nil, ids: ids, direction: 1))
    }

    @MainActor func testCommitAndCancellationRejectStaleState() {
        let controller = VerticalReorderController()
        controller.setViewport(viewport)
        for (id, frame) in frames { controller.setFrame(frame, id: id) }
        var commits: [(Int, Int)] = []
        controller.begin(source: "b", ids: ids, revision: "v1")
        controller.update(point: CGPoint(x: 30, y: 16), ids: ids, revision: "v1")
        XCTAssertEqual(controller.gap, 0)
        controller.finish(point: CGPoint(x: 30, y: 16), ids: ids, revision: "v1") { commits.append(($0, $1)) }
        XCTAssertEqual(commits.count, 1); XCTAssertEqual(commits.first?.0, 1); XCTAssertEqual(commits.first?.1, 0)
        XCTAssertFalse(controller.isDragging); XCTAssertNil(controller.gap)
        controller.begin(source: "b", ids: ids, revision: "v1")
        controller.finish(point: CGPoint(x: 30, y: 16), ids: ids, revision: "v2") { commits.append(($0, $1)) }
        XCTAssertEqual(commits.count, 1); XCTAssertFalse(controller.isDragging)
        controller.begin(source: "b", ids: ids, revision: "v1")
        controller.update(point: CGPoint(x: 30, y: 16), ids: ["a", "c", "b"], revision: "v1")
        XCTAssertFalse(controller.isDragging); XCTAssertNil(controller.gap)
        controller.finish(point: CGPoint(x: 30, y: 16), ids: ids, revision: "v1") { commits.append(($0, $1)) }
        XCTAssertEqual(commits.count, 1)
        controller.begin(source: "b", ids: ids, revision: "v1", accepts: { _, _ in false })
        controller.update(point: CGPoint(x: 30, y: 16), ids: ids, revision: "v1")
        XCTAssertNil(controller.gap)
        controller.finish(point: CGPoint(x: 30, y: 16), ids: ids, revision: "v1") { commits.append(($0, $1)) }
        XCTAssertEqual(commits.count, 1)
        controller.begin(source: "b", ids: ids, revision: "v1")
        controller.cancel()
        controller.finish(point: CGPoint(x: 30, y: 16), ids: ids, revision: "v1") { commits.append(($0, $1)) }
        XCTAssertEqual(commits.count, 1)
    }
    @MainActor func testEdgeScrollStopsAfterCancellation() async throws {
        let controller = VerticalReorderController()
        let bounds = CGRect(x: 0, y: 0, width: 120, height: 100)
        controller.setViewport(bounds)
        for (id, frame) in frames { controller.setFrame(frame, id: id) }
        var requested: [String] = []
        controller.setScrollHandler { id, _ in requested.append(id) }
        controller.begin(source: "b", ids: ids, revision: "v1")
        controller.update(point: CGPoint(x: 30, y: 95), ids: ids, revision: "v1")
        try await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertEqual(requested.first, "c")
        controller.cancel()
        let count = requested.count
        try await Task.sleep(nanoseconds: 250_000_000)
        XCTAssertEqual(requested.count, count)
    }

    @MainActor func testRapidRestartRetainsOnlyCurrentScrollTask() async throws {
        let controller = VerticalReorderController()
        controller.setViewport(CGRect(x: 0, y: 0, width: 120, height: 100))
        for (id, frame) in frames { controller.setFrame(frame, id: id) }
        var requests = 0
        controller.setScrollHandler { _, _ in requests += 1 }
        controller.begin(source: "b", ids: ids, revision: "v1")
        controller.update(point: CGPoint(x: 30, y: 95), ids: ids, revision: "v1")
        await Task.yield()
        controller.cancel()
        requests = 0
        controller.begin(source: "b", ids: ids, revision: "v2")
        controller.update(point: CGPoint(x: 30, y: 95), ids: ids, revision: "v2")
        try await Task.sleep(nanoseconds: 30_000_000)
        controller.update(point: CGPoint(x: 30, y: 95), ids: ids, revision: "v2")
        try await Task.sleep(nanoseconds: 40_000_000)
        XCTAssertEqual(requests, 1)
        controller.cancel()
        try await Task.sleep(nanoseconds: 220_000_000)
        XCTAssertEqual(requests, 1)
    }

}
