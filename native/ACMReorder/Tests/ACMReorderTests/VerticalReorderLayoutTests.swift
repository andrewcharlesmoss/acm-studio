#if os(macOS)
import AppKit
import SwiftUI
import XCTest
@testable import ACMReorder

private final class LayoutProbes {
    var views: [String: NSView] = [:]
}

private struct LayoutProbe: NSViewRepresentable {
    let id: String
    let probes: LayoutProbes
    func makeNSView(context: Context) -> NSView {
        let view = NSView()
        probes.views[id] = view
        return view
    }
    func updateNSView(_ view: NSView, context: Context) {}
}

private struct ReorderLayoutFixture: View {
    @ObservedObject var controller: VerticalReorderController
    let probes: LayoutProbes
    let ids = ["a", "b", "c"]
    var body: some View {
        VStack(spacing: 10) {
            ForEach(ids, id: \.self) { id in
                Color.clear.frame(width: 100, height: id == "b" ? 40 : 20)
                    .background(LayoutProbe(id: id, probes: probes))
                    .verticalReorderRow(controller, id: id, first: id == ids.first, last: id == ids.last)
            }
        }.frame(width: 140, height: 160, alignment: .top)
    }
}

final class VerticalReorderLayoutTests: XCTestCase {
    @MainActor func testRowsKeepTheirPositionsWhenDragStartsAndIsCancelled() async throws {
        let controller = VerticalReorderController()
        let probes = LayoutProbes()
        let hosting = NSHostingView(rootView: ReorderLayoutFixture(controller: controller, probes: probes))
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 140, height: 160), styleMask: [.borderless], backing: .buffered, defer: false)
        window.contentView = hosting
        window.layoutIfNeeded()
        try await Task.sleep(nanoseconds: 100_000_000)
        func positions() throws -> [CGFloat] {
            try ["a", "b", "c"].map { id in
                let view = try XCTUnwrap(probes.views[id])
                return view.convert(view.bounds, to: hosting).midY
            }
        }
        let idle = try positions()
        let ids = ["a", "b", "c"]
        for source in ids {
            controller.begin(source: source, ids: ids, revision: "v1")
            try await Task.sleep(nanoseconds: 100_000_000)
            hosting.layoutSubtreeIfNeeded()
            let dragging = try positions()
            controller.cancel()
            try await Task.sleep(nanoseconds: 100_000_000)
            hosting.layoutSubtreeIfNeeded()
            let cancelled = try positions()
            for index in idle.indices {
                XCTAssertEqual(dragging[index], idle[index], accuracy: 0.01, "Row \(index) moved when dragging \(source)")
                XCTAssertEqual(cancelled[index], idle[index], accuracy: 0.01, "Row \(index) moved after cancelling \(source)")
            }
        }
    }
}
#endif
