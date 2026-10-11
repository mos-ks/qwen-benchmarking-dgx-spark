"""SQLite connection and schema migrations.

Each entry in MIGRATIONS moves the schema from version i to i + 1 and runs once per database, tracked
in PRAGMA user_version. Databases in the field are on version 1: never edit a shipped migration, add
a new one.
"""

import os
import sqlite3
import threading

MIGRATIONS = [
    """
    create table groups(id integer primary key, name text not null);
    create table members(
        id integer primary key,
        group_id integer not null references groups(id),
        name text not null
    );
    create table expenses(
        id integer primary key,
        group_id integer not null references groups(id),
        payer_id integer not null references members(id),
        description text not null,
        amount_cents integer not null,
        created_at text not null
    );
    create index expenses_by_group on expenses(group_id, id);
    """,
]

_lock = threading.Lock()


def connect(path: str | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(
        path or os.environ.get("DB_PATH", "splitter.db"), check_same_thread=False
    )
    conn.execute("pragma foreign_keys = on")
    migrate(conn)
    return conn


def migrate(conn: sqlite3.Connection) -> None:
    version = conn.execute("pragma user_version").fetchone()[0]
    for i, sql in enumerate(MIGRATIONS[version:], start=version):
        with conn:
            conn.executescript(sql)
            conn.execute(f"pragma user_version = {i + 1}")


def locked():
    """One writer at a time: http.server handles requests on threads."""
    return _lock
