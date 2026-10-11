# Splitter

Shared expenses for small groups: who paid what, and who owes whom.

## Run

    ./start.sh                     # serves http://127.0.0.1:$PORT (default 8080)
    python3 -m unittest discover -s tests

`$DB_PATH` (default `./splitter.db`) is the SQLite database. Python 3.12 standard library only: no
installs, no frameworks, no CDN links.

## Layout

| Path | What it is |
|---|---|
| `app/server.py` | HTTP server and routing (`http.server`), JSON in and out |
| `app/db.py` | connection and schema migrations, tracked with `PRAGMA user_version` |
| `app/ledger.py` | money logic: shares and balances, all in integer cents |
| `static/` | the web UI, plain HTML, CSS and ES modules, served at `/` and `/groups/{id}` |
| `tests/` | API tests: each starts the real server on a free port with a temporary database |

## API

| Method and path | Body | Success | Errors |
|---|---|---|---|
| `POST /api/groups` | `{ "name", "members": [names] }` | 201, the group | 400 |
| `GET /api/groups/{id}` | | 200, `{ "id", "name", "members": [{ "id", "name" }] }` | 404 |
| `POST /api/groups/{id}/expenses` | `{ "payer_id", "description", "amount_cents" }` | 201, the expense | 400, 404 |
| `GET /api/groups/{id}/expenses` | | 200, list, newest first | 404 |
| `GET /api/groups/{id}/balances` | | 200, `[{ "member_id", "name", "balance_cents" }]` by member id | 404 |

- A group has 2-20 members with distinct, non-empty names (trimmed, at most 40 characters).
- An expense is `{ "id", "payer_id", "description", "amount_cents", "created_at" }`. `amount_cents` is a
  positive integer, `description` is trimmed, 1-80 characters, and `payer_id` must be a member of the group.
- Every member, the payer included, owes an equal share of each expense. When the amount does not divide
  evenly, the members with the lowest ids each owe one cent more, so the shares add up to the amount.
- A balance is what the member paid minus what they owe: positive means the group owes them. Balances in a
  group always add up to zero.
- Every error is JSON `{ "error": { "code": "...", "message": "..." } }`, `code` one of `validation`,
  `bad_json` or `not_found`.
