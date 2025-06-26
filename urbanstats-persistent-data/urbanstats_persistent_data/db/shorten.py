import hashlib
import sqlite3
import string

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


def table():
    conn = sqlite3.connect("db.sqlite3")
    c = conn.cursor()
    # if table does not exist, create it
    # primary key is shortened (as an integer)
    # full is the full text
    c.execute(
        """CREATE TABLE IF NOT EXISTS ShortenedData
                 (shortened integer PRIMARY KEY, full text)"""
    )
    conn.commit()
    return conn, c


def shorten(full_text):
    shortened = hashlib.sha256(full_text.encode("utf-8")).hexdigest()[-15:]
    shortened = int(shortened, 16)
    return shortened


def shorten_and_save(full_text):
    conn, c = table()
    shortened = shorten(full_text)
    # insert if it does not exist
    c.execute(
        "INSERT OR IGNORE INTO ShortenedData VALUES (?, ?)", (shortened, full_text)
    )
    conn.commit()
    shortened = num_encode(shortened)
    return shortened


def retreive_and_lengthen(shortened):
    _, c = table()
    shortened = num_decode(shortened)
    c.execute("SELECT full FROM ShortenedData WHERE shortened=?", (shortened,))
    full_text = c.fetchone()
    return full_text
