import fastapi

from .utils import DbSession


def associate_email_db(s: DbSession, user: int, email: str):
    s.c.execute(
        "INSERT OR REPLACE INTO EmailUsers VALUES (?, ?)",
        (email, user),
    )


def dissociate_email_db(s: DbSession, user: int):
    s.c.execute("DELETE FROM EmailUsers WHERE user = ?", (user,))


def get_email_users(c, email):
    c.execute("SELECT user FROM EmailUsers WHERE email=?", (email,))
    return [row[0] for row in c.fetchall()]


def get_user_email(c, user):
    c.execute("SELECT email FROM EmailUsers WHERE user=?", (user,))
    row = c.fetchone()
    if row is None:
        return None
    return row[0]


def get_user_users(c, user):
    email = get_user_email(c, user)
    if email is None:
        return [user]
    return get_email_users(c, email)
