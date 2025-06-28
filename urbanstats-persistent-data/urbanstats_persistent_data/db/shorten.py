import hashlib
import string

from ..dependencies.db_session import DbSession
import typing as t

ALPHABET = string.ascii_uppercase + string.ascii_lowercase + string.digits + "-_"
ALPHABET_REVERSE = dict((c, i) for (i, c) in enumerate(ALPHABET))
BASE = len(ALPHABET)
SIGN_CHARACTER = "$"


def num_encode(n):
    if n < 0:
        return SIGN_CHARACTER + num_encode(-n)
    s = []
    while True:
        n, r = divmod(n, BASE)
        s.append(ALPHABET[r])
        if n == 0:
            break
    return "".join(reversed(s))


def num_decode(s):
    if s[0] == SIGN_CHARACTER:
        return -num_decode(s[1:])
    n = 0
    for c in s:
        n = n * BASE + ALPHABET_REVERSE[c]
    return n


def shorten(full_text):
    shortened = hashlib.sha256(full_text.encode("utf-8")).hexdigest()[-15:]
    shortened = int(shortened, 16)
    return shortened


def shorten_and_save(s: DbSession, full_text):
    shortened = shorten(full_text)
    # insert if it does not exist
    s.c.execute(
        "INSERT OR IGNORE INTO ShortenedData VALUES (?, ?)", (shortened, full_text)
    )
    shortened = num_encode(shortened)
    return shortened


def retreive_and_lengthen(s: DbSession, shortened: string) -> t.Optional[str]:
    shortened = num_decode(shortened)
    s.c.execute("SELECT full FROM ShortenedData WHERE shortened=?", (shortened,))
    return s.c.fetchone()
