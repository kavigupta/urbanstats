import functools
import json

import flask
import requests
from pydantic import BaseModel

from ..db.email import get_email_users
from ..utils import UrbanStatsError


def get_email():
    if "x-access-token" in flask.request.headers:
        email_token = flask.request.headers["x-access-token"]
        response = requests.get(
            f"https://oauth2.googleapis.com/tokeninfo?access_token={email_token}"
        )
        if response.status_code != 200:
            raise UrbanStatsError(500, "Couldn't communicate successfully with Google")

        class InfoSchema(BaseModel):
            email: str

        info = InfoSchema(**json.loads(response.content))
        return info.email
    else:
        return None


def email():
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(user: int):
            email = get_email()
            if email:
                email_users = get_email_users(email)
                if user not in email_users:
                    raise UrbanStatsError(401, "User not associated with email")
                return fn(email_users)
            else:
                return fn([user])

        return wrapper

    return decorator
