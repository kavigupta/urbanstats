from .utils import table


def associate_email_db(user: int, email: str):
    conn, c = table()
    existing_email = _get_user_email(c, user)
    if existing_email != None and existing_email != email:
        return "conflict", 409
    # Table constraints prevent duplicates
    c.execute(
        "INSERT OR REPLACE INTO EmailUsers VALUES (?, ?)",
        (email, user),
    )
    conn.commit()
    return "success", 200


def get_email_users(email):
    conn, c = table()
    return _get_email_users(c, email)


def _get_email_users(c, email):
    c.execute("SELECT user FROM EmailUsers WHERE email=?", (email,))
    return [row[0] for row in c.fetchall()]


def _get_user_email(c, user):
    c.execute("SELECT email FROM EmailUsers WHERE user=?", (user,))
    row = c.fetchone()
    if row is None:
        return None
    return row[0]


def _get_user_users(c, user):
    email = _get_user_email(c, user)
    if email is None:
        return [user]
    return _get_email_users(c, email)
