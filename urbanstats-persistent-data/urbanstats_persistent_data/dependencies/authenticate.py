import typing as t
from dataclasses import dataclass

import fastapi
from fastapi import Header, HTTPException

from ..db.authenticate import check_secureid
from ..db.email import get_user_users
from ..utils import Hexadecimal, HTTPExceptionModel
from .db_session import DbSession, GetDbSession


@dataclass
class AuthenticatedRequest:
    s: DbSession
    user_id: int
    associated_user_ids: t.List[int]


def authenticate(
    x_user: t.Annotated[int, Hexadecimal, Header()],
    x_secure_id: t.Annotated[int, Hexadecimal, Header()],
    db_session: GetDbSession,
) -> AuthenticatedRequest:
    if not check_secureid(db_session, x_user, x_secure_id):
        raise HTTPException(401, "Invalid secure ID")
    return AuthenticatedRequest(
        db_session, x_user, get_user_users(db_session.c, x_user)
    )


authenticate_responses = {401: {"model": HTTPExceptionModel}}

AuthenticateRequest = t.Annotated[AuthenticatedRequest, fastapi.Depends(authenticate)]
