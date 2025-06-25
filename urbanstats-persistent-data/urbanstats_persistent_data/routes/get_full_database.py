import hashlib
from pydantic import BaseModel
from utils import form, error
import flask
from db.utils import get_full_database
from main import app


def valid_token(tok):
    token_must_hash_to = {
        "d02a2a95256315523dd5740e1a4d1c00b5a69752f26f891170e8078fd37aa224",
        "5f5cf96b428467624d144bb4297ae317f564af0ef0df8e6b70d2b706823add1b",
    }
    return hashlib.sha256(tok.encode("utf-8")).hexdigest() in token_must_hash_to


@app.route("/juxtastat/get_full_database", methods=["POST"])
def juxtastat_get_full_database_request():
    class Token(BaseModel):
        token: str

    if not valid_token(form(Token).token):
        return error(401, "This method requires a token, and your token is invalid!")
    return flask.jsonify(get_full_database())
