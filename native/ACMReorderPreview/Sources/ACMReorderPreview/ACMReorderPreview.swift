import AppKit
import SwiftUI
import ACMReorder

@main
struct ACMReorderPreviewApp: App {
    @NSApplicationDelegateAdaptor(PreviewDelegate.self) private var delegate
    var body: some Scene {
        Window("SwiftUI Reordering Preview", id: "preview") { ReorderPreview() }
            .defaultSize(width: 560, height: 620)
    }
}

final class PreviewDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}

private struct ReorderPreview: View {
    private let names = ["First item", "Second item", "Third item", "Fourth item"]
    private let details = ["A compact item.", "A taller item with a longer description to test unequal boundaries.", "Cross either edge of its gap.", "Try moving here, then Undo."]
    @State private var orders = [["0", "1", "2", "3"]]
    @State private var cursor = 0
    private var ids: [String] { orders[cursor] }
    @State private var selected: String?
    @State private var readOnly = false
    @StateObject private var reorder = VerticalReorderController()

    private func apply(_ next: [String]) {
        guard next != ids else { return }
        orders = Array(orders.prefix(cursor + 1)) + [next]
        cursor += 1
    }

    private func move(_ source: Int, _ gap: Int) {
        guard !readOnly, ids.indices.contains(source), (0...ids.count).contains(gap) else { return }
        var next = ids
        next.move(fromOffsets: IndexSet(integer: source), toOffset: gap)
        apply(next)
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("SwiftUI — macOS").font(.title2.bold())
            Text("This native preview uses the shared reorder behaviour. Changes stay in this window.")
            Toggle("Read-only example", isOn: $readOnly)
            ScrollViewReader { proxy in
                List(selection: $selected) {
                    ForEach(ids, id: \.self) { id in
                        let index = Int(id)!
                        HStack(spacing: 12) {
                            Image(nsImage: Self.icon).resizable().scaledToFit().frame(width: 16, height: 16)
                                .frame(width: 28, height: 28)
                                .help("Drag to reorder \(names[index])")
                                .verticalReorderHandle(reorder, id: id, ids: ids, revision: "\(readOnly)", accepts: { _, _ in !readOnly }, commit: move)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(names[index]).fontWeight(.semibold)
                                Text(details[index]).font(.callout)
                            }
                            Spacer()
                        }.padding(10)
                            .verticalReorderRow(reorder, id: id, first: ids.first == id, last: ids.last == id)
                            .verticalReorderActions(id: id, ids: ids, accepts: { _, _ in !readOnly }, commit: move)
                            .tag(id)
                    }
                }
                .verticalReorderSurface(reorder, scroll: { id, anchor in proxy.scrollTo(id, anchor: anchor) })
                .verticalReorderKeyboard(selected: selected, ids: ids, accepts: { _, _ in !readOnly }, commit: move)
            }
            HStack {
                Button("Undo") { cursor -= 1 }.keyboardShortcut("z", modifiers: .command).disabled(readOnly || cursor == 0)
                Button("Redo") { cursor += 1 }.keyboardShortcut("z", modifiers: [.command, .shift]).disabled(readOnly || cursor >= orders.count - 1)
                Spacer()
                Button("Reset Example") { apply(["0", "1", "2", "3"]) }.disabled(readOnly || ids == ["0", "1", "2", "3"])
            }
            Text("Drag a handle, or select an item and use Option + Up/Down. Escape cancels.").font(.caption).foregroundStyle(.secondary)
        }.padding(20).frame(minWidth: 420, minHeight: 460)
    }
    private static let icon: NSImage = {
        guard let url = Bundle.main.url(forResource: "reorder", withExtension: "svg"), let image = NSImage(contentsOf: url) else { return NSImage() }
        image.isTemplate = true
        return image
    }()
}
