from .utils import table


def check_secureid(user: int, secure_id: int):
    """
    Returns True iff the secure_id is correct for the given user.

    First checks if the user is already registered, if so checks
    if the secure id is correct. If the secure id is incorrect, returns False.
    Otherwise, updates the secure id and returns True.
    """
    conn, c = table()
    c.execute(
        "SELECT secure_id FROM JuxtaStatUserSecureID WHERE user=?",
        (user,),
    )
    res = c.fetchone()
    if res is None:
        # trust on first use
        c.execute(
            "INSERT INTO JuxtaStatUserSecureID VALUES (?, ?)",
            (user, secure_id),
        )
        conn.commit()
        return True
    return res[0] == secure_id
