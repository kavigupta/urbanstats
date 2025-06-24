from utils import error
import flask
import functools
from db.authenticate import check_secureid
import marshmallow as ma


def authenticate():
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper():
            class UserHeadersSchema(ma.Schema):
                user = ma.fields.Int(required=True, data_key="x-user")
                secure_id = ma.fields.Int(required=True, data_key="x-secure-id")

            req = UserHeadersSchema().load(flask.request.headers)

            if not check_secureid(req["user"], req["secure_id"]):
                return error(200, "Invalid secureID!", "bad_secureid")
            return fn(req["user"])

        return wrapper

    return decorator
