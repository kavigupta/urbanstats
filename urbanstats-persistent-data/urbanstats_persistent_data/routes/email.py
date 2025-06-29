import json

import fastapi
import requests
from pydantic import BaseModel

from ..db.email import associate_email_db
from ..dependencies.authenticate import AuthenticateRequest, authenticate_responses
from ..main import app


class AssociateEmailRequestBody(BaseModel):
    token: str


@app.post(
    "/juxtastat/associate_email", status_code=204, responses=authenticate_responses
)
def associate_email(req: AuthenticateRequest, body: AssociateEmailRequestBody):
    email = get_email(body.token)
    associate_email_db(req.s, req.user_id, email)


def get_email(token):
    response = requests.get(
        f"https://oauth2.googleapis.com/tokeninfo?access_token={token}"
    )
    if response.status_code // 100 == 4:
        raise fastapi.HTTPException(
            401, "Couldn't validate access token", "access_token"
        )
    if response.status_code != 200:
        raise fastapi.HTTPException(
            500, "Couldn't communicate successfully with Google"
        )

    class InfoSchema(BaseModel):
        email: str

    try:
        info = InfoSchema(**json.loads(response.content))
        return info.email
    except Exception as exc:
        raise fastapi.HTTPException(500, "Invalid response from Google") from exc
