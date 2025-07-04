import sqlite3
import typing as t

from .utils import DbSession


def associate_email_db(s: DbSession, user: int, email: str) -> None:
    s.c.execute(
        "INSERT OR REPLACE INTO EmailUsers VALUES (?, ?)",
        (email, user),
    )


def dissociate_email_db(s: DbSession, user: int) -> None:
    s.c.execute("DELETE FROM EmailUsers WHERE user = ?", (user,))


def get_email_users(c: sqlite3.Cursor, email: str) -> t.Set[int]:
    c.execute("SELECT user FROM EmailUsers WHERE email=?", (email,))
    return {row[0] for row in c.fetchall()}


def get_user_email(c: sqlite3.Cursor, user: int) -> str | None:
    c.execute("SELECT email FROM EmailUsers WHERE user=?", (user,))
    row = c.fetchone()
    if row is None:
        return None
    return t.cast(str, row[0])


def get_user_users(c: sqlite3.Cursor, user: int) -> t.Set[int]:
    email = get_user_email(c, user)
    if email is None:
        return {user}
    return get_email_users(c, email)
