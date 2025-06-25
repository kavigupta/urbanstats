import json
from typing import Any, List, Optional, Type, TypeVar

import flask
from pydantic import BaseModel, BeforeValidator


def corrects_to_bytes(corrects: List[bool]) -> bytes:
    result = []
    for i in range(0, len(corrects), 8):
        byte = 0
        for j in range(8):
            if i + j < len(corrects) and corrects[i + j]:
                byte |= 1 << j
        result.append(byte)
    return bytes(result)


class UrbanStatsError(Exception):
    def __init__(self, status: int, error, code: Optional[str] = None):
        self.status = status
        self.error = error
        self.code = code
        super().__init__()

    def to_dict(self):
        return {"error": self.error, "code": self.code}


T = TypeVar("T", bound=BaseModel)


def form(Model: Type[T]) -> T:
    string = flask.request.data.decode("utf-8")
    if len(string) == 0:
        raise UrbanStatsError(400, "zero-length body")
    form_data = json.loads(string)
    return Model(**form_data)


def from_hex(value: Any) -> int:
    if not isinstance(value, str):
        raise ValueError()
    return int(value, 16)


Hexadecimal = BeforeValidator(from_hex)
