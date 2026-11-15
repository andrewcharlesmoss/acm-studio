import SwiftUI

/// Temporary specimen state; it never writes a product registry or preferences.
struct PreviewSnapshot: Equatable {
    var order = ["0", "1", "2", "3"]
    var hidden: Set<String> = []
}

struct PreviewHistory {
    private var snapshots = [PreviewSnapshot()]
    private(set) var cursor = 0
    var snapshot: PreviewSnapshot { snapshots[cursor] }
    var canUndo: Bool { cursor > 0 }
    var canRedo: Bool { cursor + 1 < snapshots.count }
    var canReset: Bool { snapshot != PreviewSnapshot() }

    func displayedIDs(editing: Bool) -> [String] {
        snapshot.order.filter { editing || !snapshot.hidden.contains($0) }
    }

    private mutating func apply(_ next: PreviewSnapshot) {
        guard next != snapshot else { return }
        snapshots = Array(snapshots.prefix(cursor + 1)) + [next]
        cursor += 1
    }

    mutating func setHidden(_ hidden: Bool, id: String, readOnly: Bool) {
        guard !readOnly, snapshot.order.contains(id) else { return }
        var next = snapshot
        if hidden { next.hidden.insert(id) } else { next.hidden.remove(id) }
        apply(next)
    }

    mutating func move(source: Int, gap: Int, editing: Bool, readOnly: Bool) {
        let displayed = displayedIDs(editing: editing)
        guard !readOnly, displayed.indices.contains(source), (0...displayed.count).contains(gap) else { return }
        var moved = displayed
        moved.move(fromOffsets: IndexSet(integer: source), toOffset: gap)
        var iterator = moved.makeIterator()
        let included = Set(displayed)
        var next = snapshot
        next.order = next.order.map { included.contains($0) ? iterator.next()! : $0 }
        apply(next)
    }

    mutating func undo(readOnly: Bool) { if !readOnly && canUndo { cursor -= 1 } }
    mutating func redo(readOnly: Bool) { if !readOnly && canRedo { cursor += 1 } }
    mutating func reset(readOnly: Bool) { if !readOnly { apply(PreviewSnapshot()) } }
}
