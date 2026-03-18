# pieces-libsql

SQLite / Turso (libSQL) piece for Activepieces.

Supports both **local SQLite files** and **remote libSQL/Turso databases** using the
`@libsql/client` library.

## Connection URLs

| Database type | Example URL |
|---|---|
| Local file | `file:./database.db` |
| In-memory (testing) | `file::memory:?cache=shared` or `:memory:` |
| Remote Turso | `libsql://your-database.turso.io` |
| Remote HTTP | `https://your-database.turso.io` |

Remote databases (Turso) require an **Auth Token** in addition to the URL.

## Building

Run `npx turbo run build --filter=@activepieces/piece-libsql` to build the library.
