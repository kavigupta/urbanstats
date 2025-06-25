from typing import List
import flask
import json
from pydantic import BaseModel, BeforeValidator
from typing import Type, TypeVar, Any


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


T = TypeVar("T", bound=BaseModel)


def form(Model: Type[T]) -> T:
    form_data = flask.request.form
    if not form_data:
        form_data = json.loads(flask.request.data.decode("utf-8"))
    return Model(**form_data)


def from_hex(value: Any) -> int:
    if not isinstance(value, str):
        raise ValueError()
    return int(value, 16)


Hexadecimal = BeforeValidator(from_hex)
