/** One ordering boundary for fixture assignment writes and global removal. */
export function createTemplateDependencyGate() {
  let queue = Promise.resolve();
  return { run(operation) { const next = queue.then(operation); queue = next.catch(() => {}); return next; } };
}
