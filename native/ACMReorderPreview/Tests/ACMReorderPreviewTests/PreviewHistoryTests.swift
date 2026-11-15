import XCTest
@testable import ACMReorderPreview

final class PreviewHistoryTests: XCTestCase {
    func testHiddenItemsAreRecoverableInEditingAndUndoRedoRestoresVisibility() {
        var history = PreviewHistory()
        history.setHidden(true, id: "1", readOnly: false)
        XCTAssertEqual(history.displayedIDs(editing: false), ["0", "2", "3"])
        XCTAssertEqual(history.displayedIDs(editing: true), ["0", "1", "2", "3"])
        history.undo(readOnly: false)
        XCTAssertTrue(history.snapshot.hidden.isEmpty)
        history.redo(readOnly: false)
        XCTAssertEqual(history.snapshot.hidden, ["1"])
        history.setHidden(false, id: "1", readOnly: false)
        XCTAssertEqual(history.displayedIDs(editing: false).count, 4)
        for id in history.snapshot.order { history.setHidden(true, id: id, readOnly: false) }
        XCTAssertTrue(history.displayedIDs(editing: false).isEmpty)
        XCTAssertEqual(history.displayedIDs(editing: true), ["0", "1", "2", "3"])
    }

    func testEditingReorderIncludesHiddenItemsAndResetIsUndoable() {
        var history = PreviewHistory()
        history.setHidden(true, id: "1", readOnly: false)
        history.move(source: 1, gap: 4, editing: true, readOnly: false)
        XCTAssertEqual(history.snapshot.order, ["0", "2", "3", "1"])
        XCTAssertEqual(history.snapshot.hidden, ["1"])
        history.reset(readOnly: false)
        XCTAssertEqual(history.snapshot, PreviewSnapshot())
        history.undo(readOnly: false)
        XCTAssertEqual(history.snapshot.order, ["0", "2", "3", "1"])
        XCTAssertEqual(history.snapshot.hidden, ["1"])
    }

    func testFilteredKeyboardMoveKeepsHiddenSlotAndNoOpDoesNotCreateHistory() {
        var history = PreviewHistory()
        history.setHidden(true, id: "1", readOnly: false)
        history.move(source: 0, gap: 2, editing: false, readOnly: false)
        XCTAssertEqual(history.snapshot.order, ["2", "1", "0", "3"])
        let cursor = history.cursor
        history.move(source: 0, gap: 1, editing: false, readOnly: false)
        history.move(source: -1, gap: 2, editing: true, readOnly: false)
        history.setHidden(true, id: "missing", readOnly: false)
        XCTAssertEqual(history.cursor, cursor)
    }

    func testReadOnlyBlocksMutationsAndNewEditDiscardsRedoBranch() {
        var history = PreviewHistory()
        history.setHidden(true, id: "0", readOnly: true)
        history.move(source: 0, gap: 4, editing: true, readOnly: true)
        XCTAssertEqual(history.snapshot, PreviewSnapshot())
        history.setHidden(true, id: "0", readOnly: false)
        history.undo(readOnly: true)
        history.reset(readOnly: true)
        XCTAssertEqual(history.snapshot.hidden, ["0"])
        history.undo(readOnly: false)
        history.redo(readOnly: true)
        XCTAssertTrue(history.snapshot.hidden.isEmpty)
        history.setHidden(true, id: "2", readOnly: false)
        XCTAssertFalse(history.canRedo)
    }
}
