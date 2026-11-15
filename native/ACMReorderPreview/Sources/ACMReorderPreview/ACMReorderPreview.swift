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
    @State private var history = PreviewHistory()
    @State private var selected: String?
    @State private var readOnly = false
    @State private var editing = false
    @StateObject private var reorder = VerticalReorderController()
    private var ids: [String] { history.displayedIDs(editing: editing) }
    private var revision: String { "\(readOnly)|\(editing)|\(history.cursor)" }

    private func move(_ source: Int, _ gap: Int) {
        history.move(source: source, gap: gap, editing: editing, readOnly: readOnly)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("SwiftUI — macOS").font(.title2.bold())
            Text("This native preview uses the shared reorder behaviour. Changes stay in this window.")
            Toggle("Read-only example", isOn: $readOnly)
            HStack {
                Text("Items").font(.headline)
                Spacer()
                Text("\(ids.count)").foregroundStyle(.secondary)
                Button { editing.toggle() } label: { previewIcon("view.show") }
                    .buttonStyle(.borderless)
                    .accessibilityLabel("Edit Item Visibility and Order")
                    .accessibilityValue(editing ? "Editing" : "Not editing")
                    .help("Edit item visibility and order")
            }
            if editing {
                HStack {
                    Text("\(history.snapshot.order.count) items · \(history.snapshot.order.count - history.snapshot.hidden.count) visible · \(history.snapshot.hidden.count) hidden")
                        .font(.caption).foregroundStyle(.secondary)
                    Spacer()
                    Button("Done") { editing = false }
                }
            }
            ScrollViewReader { proxy in
                List(selection: $selected) {
                    ForEach(ids, id: \.self) { id in
                        let index = Int(id)!
                        let hidden = history.snapshot.hidden.contains(id)
                        HStack(spacing: 8) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(names[index]).fontWeight(.semibold)
                                Text(details[index]).font(.callout)
                            }
                            .opacity(editing && hidden ? 0.5 : 1)
                            Spacer(minLength: 4)
                            if editing {
                                Button { history.setHidden(!hidden, id: id, readOnly: readOnly) } label: {
                                    previewIcon(hidden ? "view.hide" : "view.show")
                                }
                                .buttonStyle(.borderless)
                                .disabled(readOnly)
                                .accessibilityLabel("\(hidden ? "Show" : "Hide") \(names[index])")
                                .accessibilityValue(hidden ? "Hidden" : "Visible")
                                .help("\(hidden ? "Show" : "Hide") \(names[index])")
                                previewIcon("reorder")
                                    .contentShape(Rectangle())
                                    .help("Drag to reorder \(names[index])")
                                    .accessibilityHidden(true)
                                    .verticalReorderHandle(reorder, id: id, ids: ids, revision: revision, accepts: { _, _ in !readOnly }, commit: move)
                                    .allowsHitTesting(!readOnly)
                                    .opacity(readOnly ? 0.5 : 1)
                            }
                        }.padding(10)
                            .accessibilityElement(children: .contain)
                            .modifier(PreviewVisibilityAction(editing: editing, hidden: hidden, name: names[index], action: { history.setHidden(!hidden, id: id, readOnly: readOnly) }))
                            .verticalReorderRow(reorder, id: id, first: ids.first == id, last: ids.last == id)
                            .verticalReorderActions(id: id, ids: ids, accepts: { _, _ in !readOnly }, commit: move)
                            .tag(id)
                    }
                }
                .overlay { if ids.isEmpty { Text("All items are hidden. Use the eye to restore them.").foregroundStyle(.secondary).padding() } }
                .verticalReorderSurface(reorder, scroll: { id, anchor in proxy.scrollTo(id, anchor: anchor) })
                .verticalReorderKeyboard(selected: selected, ids: ids, accepts: { _, _ in !readOnly }, commit: move)
            }
            HStack {
                Button("Undo") { history.undo(readOnly: readOnly) }.keyboardShortcut("z", modifiers: .command).disabled(readOnly || !history.canUndo)
                Button("Redo") { history.redo(readOnly: readOnly) }.keyboardShortcut("z", modifiers: [.command, .shift]).disabled(readOnly || !history.canRedo)
                Spacer()
                Button("Reset Example") { history.reset(readOnly: readOnly) }.disabled(readOnly || !history.canReset)
            }
            Text("Use the eye to show visibility and drag controls; Done closes editing. Changes apply immediately. Select an item and use Option + Up/Down to reorder. Escape cancels a drag.")
                .font(.caption).foregroundStyle(.secondary)
        }.padding(20).frame(minWidth: 420, minHeight: 460)
            .onChange(of: editing) { _, _ in reorder.cancel() }
            .onChange(of: readOnly) { _, _ in reorder.cancel() }
            .onChange(of: history.snapshot) { _, _ in reorder.cancel() }
    }

    private func previewIcon(_ name: String) -> some View {
        Image(nsImage: Self.icons[name] ?? NSImage()).resizable().scaledToFit()
            .frame(width: 16, height: 16).frame(width: 28, height: 28)
    }
    private static let icons: [String: NSImage] = {
        var images: [String: NSImage] = [:]
        for name in ["reorder", "view.show", "view.hide"] {
            if let url = Bundle.main.url(forResource: name, withExtension: "svg"), let image = NSImage(contentsOf: url) {
                image.isTemplate = true
                images[name] = image
            }
        }
        return images
    }()
}

private struct PreviewVisibilityAction: ViewModifier {
    let editing: Bool
    let hidden: Bool
    let name: String
    let action: () -> Void
    func body(content: Content) -> some View {
        if editing { content.accessibilityAction(named: "\(hidden ? "Show" : "Hide") \(name)", action) }
        else { content }
    }
}
