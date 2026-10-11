# Plant care

Build a small full-stack web app in this folder: a JSON API, a SQLite database and a web UI, served by
one process.

## Runtime

- `./start.sh` starts the server. It listens on the port in `$PORT` (default 8080) and serves the UI at
  `/` and the API under `/api`.
- Data lives in a SQLite database at `$DB_PATH` (default `./data.db`) and survives a restart.
- No network installs: use the Python 3.12 standard library (`http.server`, `sqlite3`, ...) or Node 22
  built-ins (`node:http`, `node:sqlite`, ...). No frameworks, no CDN links.
- Include automated tests for the API in `tests/`, runnable with one command written in this README.

## API

A plant is `{ "id": int, "name": str, "species": str, "water_every_days": int, "last_watered": "YYYY-MM-DD" | null, "next_water": "YYYY-MM-DD" | null }`.
`next_water` is `last_watered` plus `water_every_days` days, or null if never watered.

| Method and path | Body | Success | Errors |
|---|---|---|---|
| `GET /api/plants` | | 200, list sorted by `next_water` ascending, never-watered plants first, ties by `id` | |
| `POST /api/plants` | `{ "name", "species", "water_every_days" }` | 201, the plant | 400 |
| `POST /api/plants/{id}/water` | optional `{ "date": "YYYY-MM-DD" }`, default today | 200, the plant | 400, 404 |
| `DELETE /api/plants/{id}` | | 204, empty body | 404 |

Validation: `name` is trimmed and must be 1-60 characters; `species` is trimmed, 0-60 characters;
`water_every_days` is an integer from 1 to 60; `date` must be a valid calendar date. Malformed JSON is a
400 too.

Every error is JSON `{ "error": { "code": "...", "message": "..." } }` with `code` one of `validation`,
`bad_json` or `not_found`; validation errors also carry `"field"` inside `error`.

## UI

At `/`, one page:

- a list of plants showing name, species and next watering date;
- a form with inputs labelled exactly `Name`, `Species` and `Water every (days)` and a submit button
  with the text `Add plant`; a new plant appears in the list without a page reload;
- a button with the text `Water` on each plant that records today's watering and updates the shown date
  without a page reload;
- plants whose next watering date is before today show the word `Overdue`.
