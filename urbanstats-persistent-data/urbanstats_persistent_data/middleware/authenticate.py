from utils import error
import flask
import functools
from db.authenticate import check_secureid
from pydantic import BaseModel, Field


def authenticate():
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper():
            class UserHeadersSchema(BaseModel):
                user: int = Field(alias="x-user")
                secure_id: int = Field(alias="x-secure-id")

            req = UserHeadersSchema(**flask.request.headers)

            if not check_secureid(req.user, req.secure_id):
                return error(200, "Invalid secureID!", "bad_secureid")
            return fn(req.user)

        return wrapper

    return decorator
