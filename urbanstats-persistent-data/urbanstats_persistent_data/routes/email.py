import json

import fastapi
import requests
from pydantic import BaseModel

from ..db.email import associate_email_db, dissociate_email_db, get_user_email
from ..dependencies.authenticate import AuthenticateRequest, authenticate_responses
from ..main import app

import typing as t


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


def get_email_from_token(token):
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


@app.post(
    "/juxtastat/dissociate_email", responses=authenticate_responses, status_code=204
)
def dissociate_email(req: AuthenticateRequest):
    dissociate_email_db(req.s, req.user_id)


class MaybeEmailReponse(BaseModel):
    email: t.Optional[str]


@app.get("/juxtastat/email", responses=authenticate_responses)
def get_email_route(req: AuthenticateRequest) -> MaybeEmailReponse:
    return MaybeEmailReponse(email=get_user_email(req.s.c, req.user_id))
