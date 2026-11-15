import SwiftUI
#if os(macOS)
import AppKit
#endif

/// Geometry and validation for a vertical ordered list. Frames and points use
/// the same coordinate space. The candidate index denotes an insertion gap.
public enum VerticalPlacement {
    public static func candidate(ids: [String], source: String, frames: [String: CGRect], viewport: CGRect, point: CGPoint, edgeSpace: CGFloat = 8) -> Int? {
        guard ids.count > 1, Set(ids).count == ids.count, let sourceIndex = ids.firstIndex(of: source), viewport.contains(point) else { return nil }
        let visible = ids.enumerated().compactMap { index, id -> (Int, CGRect)? in
            guard let frame = frames[id], frame.width > 0, frame.height > 0, frame.intersects(viewport) else { return nil }
            return (index, frame)
        }
        guard let first = visible.first, let last = visible.last,
              point.x >= first.1.minX, point.x <= first.1.maxX,
              point.y >= first.1.minY - (first.0 == 0 ? edgeSpace : 0),
              point.y <= last.1.maxY + (last.0 == ids.count - 1 ? edgeSpace : 0) else { return nil }
        let gap = visible.first(where: { point.y < $0.1.midY })?.0 ?? last.0 + 1
        guard gap != sourceIndex, gap != sourceIndex + 1,
              line(ids: ids, gap: gap, frames: frames, viewport: viewport, edgeSpace: edgeSpace) != nil else { return nil }
        return gap
    }

    public static func line(ids: [String], gap: Int, frames: [String: CGRect], viewport: CGRect, edgeSpace: CGFloat = 8) -> CGRect? {
        guard !ids.isEmpty, (0...ids.count).contains(gap) else { return nil }
        let before = gap > 0 ? frames[ids[gap - 1]] : nil
        let after = gap < ids.count ? frames[ids[gap]] : nil
        guard (gap == 0 || before != nil), (gap == ids.count || after != nil), let reference = after ?? before else { return nil }
        let y: CGFloat
        if let before, let after { y = (before.maxY + after.minY) / 2 }
        else if let after { y = after.minY - edgeSpace / 2 }
        else if let before { y = before.maxY + edgeSpace / 2 }
        else { return nil }
        guard viewport.contains(CGPoint(x: reference.midX, y: y)) else { return nil }
        return CGRect(x: reference.minX, y: y, width: reference.width, height: 0)
    }
}

/// The consumer owns ordering, persistence and domain constraints. The
/// controller owns the drag transaction and never commits an unchanged move.
@MainActor public final class VerticalReorderController: ObservableObject {
    @Published public private(set) var gap: Int?
    @Published public private(set) var isDragging = false
    private var ids: [String] = []
    private var source: String?
    private var revision = ""
    private var accepts: ((String, Int) -> Bool)?
    private var frames: [String: CGRect] = [:]
    private var viewport = CGRect.zero
    private var scrollHandler: ((String, UnitPoint) -> Void)?
    private var scrollTask: Task<Void, Never>?
    private var scrollGeneration = UUID()
    private var lastPoint: CGPoint?
    public let edgeSpace: CGFloat

    public init(edgeSpace: CGFloat = 8) { self.edgeSpace = max(2, edgeSpace) }
    public func setScrollHandler(_ handler: ((String, UnitPoint) -> Void)?) { scrollHandler = handler }
    public func setViewport(_ frame: CGRect) { viewport = frame }
    public func setFrame(_ frame: CGRect, id: String) { frames[id] = frame }
    public func removeFrame(id: String) { frames.removeValue(forKey: id) }
    public func begin(source: String, ids: [String], revision: String, accepts: @escaping (String, Int) -> Bool = { _, _ in true }) {
        guard !isDragging, ids.count > 1, ids.contains(source), Set(ids).count == ids.count else { return }
        self.ids = ids; self.source = source; self.revision = revision; self.accepts = accepts; isDragging = true; gap = nil
    }
    public func update(point: CGPoint, ids: [String], revision: String) {
        guard isDragging, self.ids == ids, self.revision == revision, let source else { cancel(); return }
        let proposed = VerticalPlacement.candidate(ids: ids, source: source, frames: frames, viewport: viewport, point: point, edgeSpace: edgeSpace)
        gap = proposed.flatMap { accepts?(source, $0) == true ? $0 : nil }
        lastPoint = point
        updateAutoScroll()
    }
    private func updateAutoScroll() {
        guard scrollHandler != nil, scrollTask == nil, let point = lastPoint,
              viewport.contains(point), point.y < viewport.minY + 24 || point.y > viewport.maxY - 24 else { return }
        let generation = UUID()
        scrollGeneration = generation
        scrollTask = Task { @MainActor [weak self] in
            while let self, !Task.isCancelled, self.isDragging, let point = self.lastPoint, self.viewport.contains(point) {
                let visible = self.ids.enumerated().filter { self.frames[$0.element]?.intersects(self.viewport) == true }
                let before = point.y < self.viewport.minY + 24
                let after = point.y > self.viewport.maxY - 24
                guard (before || after), let first = visible.first, let last = visible.last else { break }
                let next = before ? first.offset - 1 : last.offset + 1
                guard self.ids.indices.contains(next) else { break }
                self.scrollHandler?(self.ids[next], before ? .top : .bottom)
                try? await Task.sleep(nanoseconds: 180_000_000)
                if Task.isCancelled { break }
                if let source = self.source {
                    let proposed = VerticalPlacement.candidate(ids: self.ids, source: source, frames: self.frames, viewport: self.viewport, point: point, edgeSpace: self.edgeSpace)
                    self.gap = proposed.flatMap { self.accepts?(source, $0) == true ? $0 : nil }
                }
            }
            if self?.scrollGeneration == generation { self?.scrollTask = nil }
        }
    }
    public func finish(point: CGPoint, ids: [String], revision: String, commit: (Int, Int) -> Void) {
        update(point: point, ids: ids, revision: revision)
        defer { cancel() }
        guard let source, let sourceIndex = ids.firstIndex(of: source), let gap else { return }
        commit(sourceIndex, gap)
    }
    public func cancel() { scrollGeneration = UUID(); scrollTask?.cancel(); scrollTask = nil; lastPoint = nil; gap = nil; source = nil; ids = []; revision = ""; accepts = nil; isDragging = false }
    public var insertionLine: CGRect? {
        guard let gap else { return nil }
        return VerticalPlacement.line(ids: ids, gap: gap, frames: frames, viewport: viewport, edgeSpace: edgeSpace)
    }
}

private struct ReorderSurface: ViewModifier {
    @ObservedObject var controller: VerticalReorderController
    let scroll: ((String, UnitPoint) -> Void)?
    func body(content: Content) -> some View {
        content
            .onAppear { controller.setScrollHandler(scroll) }
            .background { GeometryReader { g in Color.clear.onAppear { controller.setViewport(g.frame(in: .global)) }.onChange(of: g.frame(in: .global)) { _, f in controller.setViewport(f) } } }
            .overlay(alignment: .topLeading) { GeometryReader { g in
                if let line = controller.insertionLine {
                    let origin = g.frame(in: .global).origin
                    Rectangle().fill(Color.accentColor).frame(width: line.width, height: 2)
                        .position(x: line.midX - origin.x, y: line.minY - origin.y).allowsHitTesting(false)
                }
            }}
            .onDisappear { controller.cancel(); controller.setScrollHandler(nil) }
            .modifier(ReorderEscape(controller: controller))
    }
}

private struct ReorderEscape: ViewModifier {
    @ObservedObject var controller: VerticalReorderController
    func body(content: Content) -> some View {
#if os(macOS)
        content.onExitCommand { controller.cancel() }
#else
        content
#endif
    }
}

private struct ReorderRow: ViewModifier {
    @ObservedObject var controller: VerticalReorderController
    let id: String
    let first: Bool
    let last: Bool
    func body(content: Content) -> some View {
        content.frame(maxWidth: .infinity, alignment: .leading)
            .background { GeometryReader { g in Color.clear.onAppear { controller.setFrame(g.frame(in: .global), id: id) }.onChange(of: g.frame(in: .global)) { _, f in controller.setFrame(f, id: id) }.onDisappear { controller.removeFrame(id: id) } } }
            .padding(.top, first && controller.isDragging ? controller.edgeSpace : 0)
            .padding(.bottom, last && controller.isDragging ? controller.edgeSpace : 0)
    }
}

private struct ReorderHandle: ViewModifier {
    @ObservedObject var controller: VerticalReorderController
    let id: String
    let ids: [String]
    let revision: String
    let commit: (Int, Int) -> Void
    let accepts: (String, Int) -> Bool
    @GestureState private var active = false
    @State private var started = false
#if os(macOS)
    @State private var hovered = false
    @State private var cursorDragging = false
    @State private var previousCursor: NSCursor?

    private func restoreCursor() {
        if NSCursor.current === NSCursor.openHand || NSCursor.current === NSCursor.closedHand {
            (previousCursor ?? NSCursor.arrow).set()
        }
        previousCursor = nil
    }
#endif
    func body(content: Content) -> some View {
        content.contentShape(Rectangle()).highPriorityGesture(DragGesture(minimumDistance: 3, coordinateSpace: .global)
            .updating($active) { _, state, _ in state = true }
            .onChanged { value in
                if !started { started = true; controller.begin(source: id, ids: ids, revision: revision, accepts: accepts) }
                guard controller.isDragging else { return }
                controller.update(point: value.location, ids: ids, revision: revision)
            }
            .onEnded { value in controller.finish(point: value.location, ids: ids, revision: revision, commit: commit) })
            .onChange(of: active) { _, active in if !active { controller.cancel(); started = false } }
            .onChange(of: revision) { _, _ in controller.cancel() }
            .onChange(of: ids) { _, _ in controller.cancel() }
            .onDisappear { if active { controller.cancel() } }
#if os(macOS)
            .onHover { inside in
                hovered = inside
                if controller.isDragging && !started && !cursorDragging { return }
                if inside && !controller.isDragging {
                    previousCursor = NSCursor.current
                    NSCursor.openHand.set()
                } else if !inside && started && controller.isDragging {
                    NSCursor.closedHand.set()
                } else if !inside {
                    restoreCursor()
                }
            }
            .onChange(of: controller.isDragging) { _, dragging in
                if dragging && started {
                    cursorDragging = true
                    if previousCursor == nil { previousCursor = NSCursor.current }
                    NSCursor.closedHand.set()
                } else if !dragging && cursorDragging {
                    cursorDragging = false
                    if hovered { NSCursor.openHand.set() } else { restoreCursor() }
                } else if !dragging && hovered {
                    // Run after the source handle has restored its cursor.
                    DispatchQueue.main.async {
                        guard hovered, !controller.isDragging else { return }
                        previousCursor = NSCursor.current === NSCursor.closedHand || NSCursor.current === NSCursor.openHand ? .arrow : NSCursor.current
                        NSCursor.openHand.set()
                    }
                }
            }
            .onDisappear { hovered = false; restoreCursor() }
#endif
    }
}

/// Keyboard moves use the same insertion-gap semantics as pointer moves.
public enum ReorderKeyboard {
#if os(macOS)
    static func macDirection(keyCode: UInt16, modifiers: NSEvent.ModifierFlags) -> Int? {
        guard modifiers.intersection([.option, .command, .control, .shift]) == .option else { return nil }
        switch keyCode { case 126: return -1; case 125: return 1; default: return nil }
    }
#endif
    public static func move(id: String?, ids: [String], direction: Int, accepts: (String, Int) -> Bool = { _, _ in true }) -> (Int, Int)? {
        guard let id, let index = ids.firstIndex(of: id), direction == -1 || direction == 1, ids.indices.contains(index + direction) else { return nil }
        let gap = direction < 0 ? index - 1 : index + 2
        guard accepts(id, gap) else { return nil }
        return (index, gap)
    }
}

private struct ReorderKeyboardHandler: ViewModifier {
    let selected: String?
    let ids: [String]
    let accepts: (String, Int) -> Bool
    let commit: (Int, Int) -> Void
    func body(content: Content) -> some View {
#if os(macOS)
        content.background { ReorderMacKeyboardMonitor(selected: selected, ids: ids, accepts: accepts, commit: commit) }
#else
        content.onKeyPress(keys: [.upArrow, .downArrow], phases: .down) { event in
            guard event.modifiers == .option else { return .ignored }
            let direction = event.key == .upArrow ? -1 : 1
            if let (index, gap) = ReorderKeyboard.move(id: selected, ids: ids, direction: direction, accepts: accepts) {
                commit(index, gap)
            }
            return selected == nil ? .ignored : .handled
        }
#endif
    }

}

#if os(macOS)
/// A native List consumes Option-arrow before SwiftUI's onKeyPress. The local
/// monitor intercepts it only while this specific list owns keyboard focus.
private struct ReorderMacKeyboardMonitor: NSViewRepresentable {
    let selected: String?
    let ids: [String]
    let accepts: (String, Int) -> Bool
    let commit: (Int, Int) -> Void

    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeNSView(context: Context) -> Probe {
        let view = Probe()
        context.coordinator.probe = view
        context.coordinator.start()
        return view
    }
    func updateNSView(_ view: Probe, context: Context) {
        context.coordinator.selected = selected
        context.coordinator.ids = ids
        context.coordinator.accepts = accepts
        context.coordinator.commit = commit
    }
    static func dismantleNSView(_ view: Probe, coordinator: Coordinator) { coordinator.stop() }

    final class Probe: NSView {
        override func hitTest(_ point: NSPoint) -> NSView? { nil }
    }
    final class Coordinator {
        weak var probe: NSView?
        var selected: String?
        var ids: [String] = []
        var accepts: (String, Int) -> Bool = { _, _ in true }
        var commit: (Int, Int) -> Void = { _, _ in }
        private var monitor: Any?

        func start() {
            guard monitor == nil else { return }
            monitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
                guard let self, let probe = self.probe, let window = probe.window,
                      NSApp.keyWindow === window, event.window === window,
                      let direction = ReorderKeyboard.macDirection(keyCode: event.keyCode, modifiers: event.modifierFlags),
                      self.selected != nil,
                      let responder = window.firstResponder as? NSView,
                      !(responder is NSTextView), !(responder is NSTextField),
                      !(responder is any NSTextInputClient) else { return event }
                var ancestor: NSView? = responder
                while ancestor != nil && !(ancestor is NSTableView) { ancestor = ancestor?.superview }
                guard let table = ancestor as? NSTableView, let scroll = table.enclosingScrollView else { return event }
                let listRect = probe.convert(probe.bounds, to: nil)
                guard listRect.width > 0, listRect.height > 0 else { return event }
                func matchingScrolls(_ view: NSView) -> [NSScrollView] {
                    var matches: [NSScrollView] = []
                    if let candidate = view as? NSScrollView {
                        let intersection = listRect.intersection(candidate.convert(candidate.bounds, to: nil))
                        if !intersection.isNull, intersection.width * intersection.height >= listRect.width * listRect.height * 0.5 {
                            matches.append(candidate)
                        }
                    }
                    for child in view.subviews { matches.append(contentsOf: matchingScrolls(child)) }
                    return matches
                }
                // Resolve the closest common subtree. Ambiguous overlapping or
                // nested scroll views are deliberately not intercepted.
                var container: NSView? = probe.superview
                var matches: [NSScrollView] = []
                while let current = container {
                    matches = matchingScrolls(current)
                    if !matches.isEmpty { break }
                    container = current.superview
                }
                guard matches.count == 1, matches[0] === scroll else { return event }
                if let (index, gap) = ReorderKeyboard.move(id: self.selected, ids: self.ids, direction: direction, accepts: self.accepts) {
                    self.commit(index, gap)
                }
                return nil
            }
        }
        func stop() {
            if let monitor { NSEvent.removeMonitor(monitor); self.monitor = nil }
        }
        deinit { stop() }
    }
}
#endif

private struct ReorderActions: ViewModifier {
    let id: String
    let ids: [String]
    let accepts: (String, Int) -> Bool
    let commit: (Int, Int) -> Void
    private func move(_ direction: Int) {
        guard let index = ids.firstIndex(of: id), ids.indices.contains(index + direction) else { return }
        let gap = direction < 0 ? index - 1 : index + 2
        guard accepts(id, gap) else { return }
        commit(index, gap)
    }
    func body(content: Content) -> some View {
        content.contextMenu {
            Button("Move Up") { move(-1) }.disabled(ids.first == id)
            Button("Move Down") { move(1) }.disabled(ids.last == id)
        }
        .accessibilityAction(named: "Move Up") { move(-1) }
        .accessibilityAction(named: "Move Down") { move(1) }
    }
}

public extension View {
    /// Attach directly to the list which owns selection, not to text editors.
    func verticalReorderKeyboard(selected: String?, ids: [String], accepts: @escaping (String, Int) -> Bool = { _, _ in true }, commit: @escaping (Int, Int) -> Void) -> some View { modifier(ReorderKeyboardHandler(selected: selected, ids: ids, accepts: accepts, commit: commit)) }
    func verticalReorderActions(id: String, ids: [String], accepts: @escaping (String, Int) -> Bool = { _, _ in true }, commit: @escaping (Int, Int) -> Void) -> some View { modifier(ReorderActions(id: id, ids: ids, accepts: accepts, commit: commit)) }
    func verticalReorderSurface(_ controller: VerticalReorderController, scroll: ((String, UnitPoint) -> Void)? = nil) -> some View { modifier(ReorderSurface(controller: controller, scroll: scroll)) }
    func verticalReorderRow(_ controller: VerticalReorderController, id: String, first: Bool, last: Bool) -> some View { modifier(ReorderRow(controller: controller, id: id, first: first, last: last)) }
    func verticalReorderHandle(_ controller: VerticalReorderController, id: String, ids: [String], revision: String, accepts: @escaping (String, Int) -> Bool = { _, _ in true }, commit: @escaping (Int, Int) -> Void) -> some View { modifier(ReorderHandle(controller: controller, id: id, ids: ids, revision: revision, commit: commit, accepts: accepts)) }
}
