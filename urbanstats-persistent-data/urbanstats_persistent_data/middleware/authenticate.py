import functools
from typing import Annotated

import flask
from pydantic import BaseModel, Field

from ..db.authenticate import check_secureid
from ..utils import Hexadecimal, UrbanStatsError


def authenticate():
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper():
            class UserHeadersSchema(BaseModel):
                user: Annotated[int, Field(alias="X-User"), Hexadecimal]
                secure_id: Annotated[int, Field(alias="X-Secure-Id"), Hexadecimal]

            req = UserHeadersSchema(**flask.request.headers)

            if not check_secureid(req.user, req.secure_id):
                raise UrbanStatsError(401, "Invalid secureID!", "bad_secureid")
            return fn(req.user)

        return wrapper

    return decorator
