export function shouldProtectTestSiteBeforeUnload({ dirty, saving, promptRunning, editingPaused }: {
  dirty: boolean;
  saving: boolean;
  promptRunning: boolean;
  editingPaused: boolean;
}) {
  return saving || promptRunning || dirty && !editingPaused;
}
