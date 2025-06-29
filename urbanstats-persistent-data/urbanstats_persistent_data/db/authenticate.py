from ..dependencies.db_session import DbSession


def check_secureid(s: DbSession, user: int, secure_id: int):
    """
    Returns True iff the secure_id is correct for the given user.

    First checks if the user is already registered, if so checks
    if the secure id is correct. If the secure id is incorrect, returns False.
    Otherwise, updates the secure id and returns True.
    """
    with s.conn:
        s.c.execute("BEGIN IMMEDIATE")
        s.c.execute(
            "SELECT secure_id FROM JuxtaStatUserSecureID WHERE user=?",
            (user,),
        )
        res = s.c.fetchone()
        if res is None:
            # trust on first use
            s.c.execute(
                "INSERT INTO JuxtaStatUserSecureID VALUES (?, ?)",
                (user, secure_id),
            )
            return True
        return res[0] == secure_id
