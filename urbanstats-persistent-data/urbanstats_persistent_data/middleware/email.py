import functools
import flask
import requests
import json
from db.email import get_email_users
from utils import error
from pydantic import BaseModel


def email(require_association=True):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(user: int):
            if "x-access-token" in flask.request.headers:
                email_token = flask.request.headers["x-access-token"]
                response = requests.get(
                    f"https://oauth2.googleapis.com/tokeninfo?access_token={email_token}"
                )
                if response.status_code != 200:
                    return error(500, "Couldn't communicate successfully with Google")

                class InfoSchema(BaseModel):
                    email: str

                info = InfoSchema(**json.loads(response.content))

                email_users = get_email_users(info["email"])

                if require_association and user not in email_users:
                    return error(400, "User not associated with email")

                return fn(email_users, info["email"])
            else:
                return fn([user], None)

        return wrapper

    return decorator
