from ..utils import error, Hexadecimal
import flask
import functools
from ..db.authenticate import check_secureid
from pydantic import BaseModel, Field, field_validator
from typing import Annotated


def authenticate():
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper():
            class UserHeadersSchema(BaseModel):
                user: Annotated[int, Field(alias="X-User"), Hexadecimal]
                secure_id: Annotated[int, Field(alias="X-Secure-Id"), Hexadecimal]

            req = UserHeadersSchema(**flask.request.headers)

            if not check_secureid(req.user, req.secure_id):
                return error(200, "Invalid secureID!", "bad_secureid")
            return fn(req.user)

        return wrapper

    return decorator
