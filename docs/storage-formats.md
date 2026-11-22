# Current Studio storage formats

Consult this table before importing a file, diagnosing a refused save, or choosing
a recovery build. A reader checks both the envelope version and the features
permitted at that version. Keep an unreadable original intact.

| Format | Current writer | Oldest supported input |
|---|---:|---:|
| Browser workspace | 67 | 2 |
| Local publications | 58 | 1 |
| Template packages and stores | 0.78.0 | 0.1.0 |
| Block clipboard | 42 | 1 |
| Full backup content | 47 | 1 |
| Binary backup container | 1 | 1 |
| Test and Test2 fixture source | 57 | 1 |
| Global template library | 49 | 1 |
| Local fixture backup | 2 | 1 |
| Files IndexedDB | 3 | 1 |

The browser workspace, local fixture sources, and shared template library have
distinct owners. Restore a browser backup through **Backup and restore**.
Recover shared originals through Templates and fixture data through the
selected site's gateway. See [Files saving](files-saving.md) for database
upgrade and rollback behaviour.
