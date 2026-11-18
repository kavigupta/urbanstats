import typing as t
from dataclasses import dataclass

import fastapi
from fastapi import Header, HTTPException

from ..db.authenticate import check_secureid
from ..db.email import get_email_users, get_user_email
from ..db.utils import DbSession
from ..utils import Hexadecimal, HTTPExceptionModel
from .db_session import GetDbSession


@dataclass
class AuthenticatedRequest:
    s: DbSession
    user_id: int
    associated_user_ids: t.Set[int]
    email: str | None


def authenticate(
    x_user: t.Annotated[int, Hexadecimal, Header()],
    x_secure_id: t.Annotated[int, Hexadecimal, Header()],
    db_session: GetDbSession,
) -> AuthenticatedRequest:
    if not check_secureid(db_session, x_user, x_secure_id):
        raise HTTPException(401, "Invalid secure ID")
    email = get_user_email(db_session.c, x_user)
    return AuthenticatedRequest(
        db_session,
        x_user,
        {x_user} if email is None else get_email_users(db_session.c, email),
        email,
    )


authenticate_responses: dict[int | str, dict[str, t.Any]] = {
    401: {"model": HTTPExceptionModel}
}

AuthenticateRequest = t.Annotated[AuthenticatedRequest, fastapi.Depends(authenticate)]
