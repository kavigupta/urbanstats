from typing import List
import flask
import json
import hashlib


def corrects_to_bytes(corrects: List[bool]) -> bytes:
    result = []
    for i in range(0, len(corrects), 8):
        byte = 0
        for j in range(8):
            if i + j < len(corrects) and corrects[i + j]:
                byte |= 1 << j
        result.append(byte)
    return bytes(result)


def error(status, message, code=None):
    return flask.jsonify({"error": message, "code": code}), status


def flask_form():
    form = flask.request.form
    if not form:
        form = json.loads(flask.request.data.decode("utf-8"))
    return form


def valid_token(tok):
    token_must_hash_to = {
        "d02a2a95256315523dd5740e1a4d1c00b5a69752f26f891170e8078fd37aa224",
        "5f5cf96b428467624d144bb4297ae317f564af0ef0df8e6b70d2b706823add1b",
    }
    return hashlib.sha256(tok.encode("utf-8")).hexdigest() in token_must_hash_to
