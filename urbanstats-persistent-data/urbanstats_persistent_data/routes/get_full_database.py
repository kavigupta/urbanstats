import hashlib

import fastapi
from pydantic import BaseModel

from ..db.utils import get_full_database
from ..dependencies.db_session import GetDbSession
from ..main import app


def valid_token(tok):
    token_must_hash_to = {
        "d02a2a95256315523dd5740e1a4d1c00b5a69752f26f891170e8078fd37aa224",
        "5f5cf96b428467624d144bb4297ae317f564af0ef0df8e6b70d2b706823add1b",
    }
    return hashlib.sha256(tok.encode("utf-8")).hexdigest() in token_must_hash_to


class TokenBody(BaseModel):
    token: str


@app.post("/juxtastat/get_full_database")
def juxtastat_get_full_database_request(s: GetDbSession, body: TokenBody):
    if not valid_token(body.token):
        raise fastapi.HTTPException(
            401, "This method requires a token, and your token is invalid!"
        )
    return get_full_database(s)
