# Team notes

Build a multi-user notes app in this folder: a JSON API, a SQLite database and a web UI, served by one
process. Several people use it at once, from more than one tab, on flaky connections.

## Runtime

- `./start.sh` starts the server. It listens on the port in `$PORT` (default 8080) and serves the UI at
  `/` and the API under `/api`.
- Data lives in a SQLite database at `$DB_PATH` (default `./data.db`). Everything, sessions included,
  survives a restart.
- No network installs: use the Python 3.12 standard library (`http.server`, `sqlite3`, `hashlib`, ...) or
  Node 22 built-ins (`node:http`, `node:sqlite`, `node:crypto`, ...). No frameworks, no CDN links.
- Include automated tests for the API in `tests/`, runnable with one command written in this README.

## Accounts and sessions

| Method and path | Body | Success | Errors |
|---|---|---|---|
| `POST /api/users` | `{ "username", "password" }` | 201, `{ "id", "username" }` | 400, 409 `conflict` if the username is taken |
| `POST /api/sessions` | `{ "username", "password" }` | 201, `{ "token" }` | 400, 401 |
| `DELETE /api/sessions` | | 204, empty body; the token stops working | 401 |

- `username` is 3-30 characters of `a-z`, `0-9` and `_`. `password` is at least 8 characters.
- Passwords are stored as a salted, slow hash (PBKDF2, scrypt or similar), never as plain text.
- Every `/api/notes` route and `DELETE /api/sessions` need `Authorization: Bearer <token>`. A missing,
  unknown or signed-out token is a 401.

## Notes

A note is `{ "id": int, "title": str, "body": str, "version": int, "updated_at": str }`, where
`updated_at` is an ISO 8601 UTC timestamp. Notes are private: a user only ever sees their own.

| Method and path | Body | Success | Errors |
|---|---|---|---|
| `POST /api/notes` | `{ "title", "body" }` | 201, the note with `version` 1 | 400, 422 |
| `GET /api/notes?limit=N&cursor=C` | | 200, `{ "items": [...], "next_cursor": str \| null }` | 400 |
| `GET /api/notes/{id}` | | 200, the note | 404 |
| `PATCH /api/notes/{id}` | `{ "version", "title"?, "body"? }` | 200, the note with `version` + 1 | 400, 404, 409 |
| `DELETE /api/notes/{id}` | | 204, empty body | 404 |

- Validation: `title` is trimmed and must be 1-120 characters; `body` is 0-10000 characters; `version`
  is required on `PATCH` and is an integer.
- Listing is newest first: `updated_at` descending, then `id` descending. `limit` defaults to 20; values
  above 100 are served as 100; anything that is not a positive integer is a 400. `next_cursor` is
  opaque to the client and null on the last page. Walking every page returns every note exactly once,
  even when many notes share the same `updated_at`.
- Another user's note is a 404, the same as a missing one: never reveal that it exists.
- Lost-update protection: a `PATCH` whose `version` is not the note's current version is a 409 with code
  `version_conflict`, and its error carries `"current"`: the note as it is now.
- Retries: `POST /api/notes` honours an `Idempotency-Key` header. Repeating a request with the same key
  and the same body returns the original 201 response again and creates nothing. The same key with a
  different body is a 422 with code `idempotency_mismatch`. Keys are scoped to the user.

Every error is JSON `{ "error": { "code": "...", "message": "..." } }` with `code` one of `validation`,
`bad_json`, `unauthorized`, `not_found`, `conflict`, `version_conflict` or `idempotency_mismatch`.

## UI

At `/`, one page:

- signed out: inputs labelled exactly `Username` and `Password` and buttons with the text `Sign in` and
  `Create account` (which creates the account and signs in);
- signed in: the user's notes, newest first, showing each title; a form with inputs labelled exactly
  `Title` and `Body` and a button with the text `Save note`, after which the new note appears without a
  page reload; a button with the text `Sign out`;
- a page reload keeps the user signed in; signing out shows the sign-in form again;
- a failed sign-in shows an error message on the page.
