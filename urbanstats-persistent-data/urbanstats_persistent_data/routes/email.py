import json
import typing as t

import fastapi
import requests
from pydantic import BaseModel

from ..db.email import associate_email_db, dissociate_email_db, get_user_email
from ..dependencies.authenticate import AuthenticateRequest, authenticate_responses
from ..main import app

google_client_id = (
    "866758015458-r7t30bm7b492c1mevid587apej6cjte6.apps.googleusercontent.com"
)


class AssociateEmailRequestBody(BaseModel):
    token: str


class AssociateEmailResponse(BaseModel):
    email: str


@app.post("/juxtastat/associate_email", responses=authenticate_responses)
def associate_email(
    req: AuthenticateRequest, body: AssociateEmailRequestBody
) -> AssociateEmailResponse:
    email = get_email_from_token(body.token)
    associate_email_db(req.s, req.user_id, email)
    return AssociateEmailResponse(email=email)


def get_email_from_token(token: str) -> str:
    response = requests.get(
        f"https://oauth2.googleapis.com/tokeninfo?access_token={token}"
    )
    if response.status_code // 100 == 4:
        raise fastapi.HTTPException(401, "Couldn't validate access token")
    if response.status_code != 200:
        raise fastapi.HTTPException(
            500, "Couldn't communicate successfully with Google"
        )

    class InfoSchema(BaseModel):
        email: str
        email_verified: bool
        aud: str

    try:
        info = InfoSchema(**json.loads(response.content))
    except Exception as exc:
        raise fastapi.HTTPException(500, "Invalid response from Google") from exc

    # Google will describe a token issued to any client, so without this an
    # attacker could authenticate as anyone who signed into an app they control
    if info.aud != google_client_id:
        raise fastapi.HTTPException(401, "Access token was issued to another client")
    if not info.email_verified:
        raise fastapi.HTTPException(401, "Email is not verified")

    return info.email


@app.post(
    "/juxtastat/dissociate_email", responses=authenticate_responses, status_code=204
)
def dissociate_email(req: AuthenticateRequest) -> None:
    dissociate_email_db(req.s, req.user_id)


class MaybeEmailReponse(BaseModel):
    email: t.Optional[str]


@app.get("/juxtastat/email", responses=authenticate_responses)
def get_email_route(req: AuthenticateRequest) -> MaybeEmailReponse:
    return MaybeEmailReponse(email=get_user_email(req.s.c, req.user_id))
