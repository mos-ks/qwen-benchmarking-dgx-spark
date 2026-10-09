# Habits API

Build a small HTTP JSON API for habit tracking. Python 3 standard library only (`http.server`,
`sqlite3`, `json`, `datetime`, ...): no pip installs, no frameworks.

## Running

    python3 server.py --port 8123 --db /path/to/habits.db

The server must keep running until killed, create the database file if it does not exist, and keep
all data in that SQLite file so it survives a restart. If the environment variable `HABITS_TODAY`
is set (`YYYY-MM-DD`), use it as today's date; otherwise use the local date.

## Endpoints

All request and response bodies are JSON (`Content-Type: application/json`).

| Method and path | Success | Notes |
|---|---|---|
| `POST /habits` | `201` + habit | body `{"name": str, "target_per_week": int}` |
| `GET /habits` | `200` + page | query `limit` (default 20, max 100), `after` (habit id) |
| `DELETE /habits/{id}` | `204`, empty body | deletes the habit and its check-ins |
| `POST /habits/{id}/checkins` | `201` + `{"habit_id", "date"}` | body `{"date": "YYYY-MM-DD"}` |
| `GET /habits/{id}/streak` | `200` + `{"current_streak": int, "longest_streak": int}` | |

A habit is `{"id": int, "name": str, "target_per_week": int, "created_at": "YYYY-MM-DD"}`.

Rules:

- `name` is a string of 1-80 characters after trimming whitespace (store the trimmed value).
  `target_per_week` is an integer from 1 to 14 (booleans are not integers).
- `GET /habits` returns `{"items": [...], "next_after": int | null}` ordered by `id` ascending,
  containing only habits with `id > after`. `next_after` is the id of the last item when more
  habits exist after this page, else `null`. `limit` outside 1-100 or a non-integer `limit`/`after`
  is a validation error.
- A check-in date must be a valid `YYYY-MM-DD` date and not after today (422 otherwise). Checking
  in twice on the same date for the same habit is a 409 conflict.
- `current_streak` is the number of consecutive days with a check-in ending today, or ending
  yesterday if there is no check-in today; 0 otherwise. `longest_streak` is the longest run of
  consecutive check-in days ever.
- Unknown habit id: 404. Unknown path: 404. Known path with an unsupported method: 405.

## Errors

Every error uses one envelope and never includes a Python traceback or exception text:

    {"error": {"code": "<code>", "message": "<human readable>"}}

| Status | `code` |
|---|---|
| 400 | `bad_json` (body is not valid JSON or not an object) |
| 404 | `not_found` |
| 405 | `method_not_allowed` |
| 409 | `conflict` |
| 422 | `validation_error` |

## Tests

Write tests with the standard library `unittest` in `tests/`, runnable with:

    python3 -m unittest discover -s tests

They must start the real server on a free port against a temporary database.
