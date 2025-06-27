from typing import Annotated, List, Optional

import flask
from flask_pydantic_spec import Response
from pydantic import BaseModel

from ..db.friends import friend_request, infinite_results, todays_score_for, unfriend
from ..db.utils import QuizKind
from ..main import api, app
from ..middleware.authenticate import UserHeadersSchema, authenticate
from ..middleware.email import EmailHeadersSchema, email
from ..utils import EmptyResponse, Hexadecimal, UrbanStatsErrorModel


class Requestee(BaseModel):
    requestee: Annotated[int, Hexadecimal]


@app.route("/juxtastat/friend_request", methods=["POST"])
@api.validate(
    headers=UserHeadersSchema,
    body=Requestee,
    resp=Response(
        HTTP_200=EmptyResponse,
        HTTP_401=UrbanStatsErrorModel,
        HTTP_500=UrbanStatsErrorModel,
    ),
)
@authenticate()
def juxtastat_friend_request(user):
    friend_request(Requestee(**flask.request.json).requestee, user)
    return flask.jsonify(dict())


@app.route("/juxtastat/unfriend", methods=["POST"])
@api.validate(
    headers=UserHeadersSchema,
    body=Requestee,
    resp=Response(
        HTTP_200=EmptyResponse,
        HTTP_401=UrbanStatsErrorModel,
        HTTP_500=UrbanStatsErrorModel,
    ),
)
@authenticate()
def juxtastat_unfriend(user):
    unfriend(Requestee(**flask.request.json).requestee, user)
    return flask.jsonify(dict())


class ScoreRequest(BaseModel):
    requesters: List[Annotated[int, Hexadecimal]]
    date: int
    quiz_kind: QuizKind


class Result(BaseModel):
    corrects: Optional[List[bool]] = None
    friends: bool


class ScoreResponse(BaseModel):
    results: List[Result]


@app.route("/juxtastat/todays_score_for", methods=["POST"])
@api.validate(
    headers=EmailHeadersSchema,
    body=ScoreRequest,
    resp=Response(
        HTTP_200=ScoreResponse,
        HTTP_401=UrbanStatsErrorModel,
        HTTP_500=UrbanStatsErrorModel,
    ),
)
@authenticate()
@email()
def juxtastat_todays_score_for(users):
    req = ScoreRequest(**flask.request.json)
    res = dict(
        results=todays_score_for(
            users,
            req.requesters,
            req.date,
            req.quiz_kind,
        )
    )
    return flask.jsonify(res)


class InfiniteScoreRequest(BaseModel):
    requesters: List[Annotated[int, Hexadecimal]]
    seed: str
    version: int


class InfiniteResult(BaseModel):
    forThisSeed: Optional[int] = None
    maxScore: Optional[int] = None
    maxScoreSeed: Optional[str] = None
    maxScoreVersion: Optional[int] = None
    friends: bool


class InfiniteScoreResponse(BaseModel):
    results: List[InfiniteResult]


@app.route("/juxtastat/infinite_results", methods=["POST"])
@api.validate(
    headers=EmailHeadersSchema,
    body=InfiniteScoreRequest,
    resp=Response(
        HTTP_200=InfiniteScoreResponse,
        HTTP_401=UrbanStatsErrorModel,
        HTTP_500=UrbanStatsErrorModel,
    ),
)
@authenticate()
@email()
def juxtastat_infinite_results(users):
    req = InfiniteScoreRequest(**flask.request.json)

    res = dict(
        results=infinite_results(
            users,
            req.requesters,
            req.seed,
            req.version,
        )
    )

    return flask.jsonify(res)
