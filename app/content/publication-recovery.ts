import { LOCAL_PUBLICATIONS_KEY, LOCAL_WORKSPACE_KEY, PUBLICATION_JOURNAL_KEY } from "./local-storage-keys.ts";

type Journal = { version: 1; operationId: string; previousWorkspace: string | null };
type Authority = () => boolean;

function readJournal(storage: Storage): Journal | null {
  const raw = storage.getItem(PUBLICATION_JOURNAL_KEY);
  if (raw === null) return null;
  const value = JSON.parse(raw);
  if (!value || value.version !== 1 || typeof value.operationId !== "string" ||
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value.operationId) ||
    !(value.previousWorkspace === null || typeof value.previousWorkspace === "string")) {
    throw new Error("The local publication recovery record is unreadable.");
  }
  return value;
}

function committed(storage: Storage, journal: Journal) {
  const raw = storage.getItem(LOCAL_PUBLICATIONS_KEY);
  return raw !== null && JSON.parse(raw)?.publicationCommitId === journal.operationId;
}

function checkOwner(authorised: Authority) {
  if (!authorised()) throw new Error("Publication recovery requires the Studio writer.");
}

/** Read-only tabs see the workspace corresponding to the visible publication. */
export function readPublicationWorkspace(storage: Storage) {
  const journal = readJournal(storage);
  return journal && !committed(storage, journal) ? journal.previousWorkspace : storage.getItem(LOCAL_WORKSPACE_KEY);
}

/** The caller retains the writer lock, including during load or exclusive restore. */
export function recoverPendingPublication(storage: Storage, authorised: Authority) {
  const journal = readJournal(storage);
  if (!journal) return;
  checkOwner(authorised);
  if (!committed(storage, journal) && storage.getItem(LOCAL_WORKSPACE_KEY) !== journal.previousWorkspace) {
    if (journal.previousWorkspace === null) storage.removeItem(LOCAL_WORKSPACE_KEY);
    else storage.setItem(LOCAL_WORKSPACE_KEY, journal.previousWorkspace);
  }
  checkOwner(authorised);
  storage.removeItem(PUBLICATION_JOURNAL_KEY);
}

/** Validation precedes this synchronous transaction. The final publication write
 * carries its commit ID, so an interrupted cleanup cannot undo a committed pair. */
export function commitLocalPublication(storage: Storage, workspace: string, publication: object, authorised: Authority) {
  checkOwner(authorised);
  const operationId = crypto.randomUUID();
  const nextPublications = JSON.stringify({ ...publication, publicationCommitId: operationId });
  recoverPendingPublication(storage, authorised);
  const journal: Journal = { version: 1, operationId, previousWorkspace: storage.getItem(LOCAL_WORKSPACE_KEY) };
  storage.setItem(PUBLICATION_JOURNAL_KEY, JSON.stringify(journal));
  try {
    checkOwner(authorised);
    storage.setItem(LOCAL_WORKSPACE_KEY, workspace);
    checkOwner(authorised);
    storage.setItem(LOCAL_PUBLICATIONS_KEY, nextPublications);
  } catch (error) {
    try { recoverPendingPublication(storage, authorised); }
    catch (recoveryError) { throw new AggregateError([error, recoveryError], "Local publication recovery is incomplete. Reload Studio before editing."); }
    throw error;
  }
  try {
    checkOwner(authorised);
    storage.removeItem(PUBLICATION_JOURNAL_KEY);
    return true;
  } catch {
    return false;
  }
}
