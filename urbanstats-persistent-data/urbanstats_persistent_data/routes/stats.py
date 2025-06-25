from typing import List, Tuple

import flask
from flask_pydantic_spec import Response
from pydantic import BaseModel

from ..db.stats import (
    get_per_question_stats,
    get_per_question_stats_retrostat,
    has_infinite_stats,
    latest_day,
    latest_week_retrostat,
    register_user,
    store_user_stats,
    store_user_stats_infinite,
    store_user_stats_retrostat,
)
from ..main import api, app
from ..middleware.authenticate import UserHeadersSchema, authenticate
from ..middleware.email import EmailHeadersSchema, email
from ..utils import EmptyResponse


class RegisterRequest(BaseModel):
    domain: str


@app.route("/juxtastat/register_user", methods=["POST"])
@api.validate(
    headers=UserHeadersSchema,
    body=RegisterRequest,
    resp=Response(HTTP_200=EmptyResponse),
)
@authenticate()
def juxtastat_register_user_request(user):
    register_user(user, RegisterRequest(**flask.request.json).domain)
    return flask.jsonify(dict()), 200


class LatestDayResponse(BaseModel):
    latest_day: int


@app.route("/juxtastat/latest_day", methods=["GET"])
@api.validate(
    headers=EmailHeadersSchema,
    resp=Response(HTTP_200=LatestDayResponse),
)
@authenticate()
@email()
def juxtastat_latest_day_request(users):
    ld = latest_day(users)
    return flask.jsonify(dict(latest_day=ld))


@app.route("/retrostat/latest_week", methods=["GET"])
@api.validate(
    headers=EmailHeadersSchema,
    resp=Response(HTTP_200=LatestDayResponse),
)
@authenticate()
@email()
def retrostat_latest_week_request(users):
    ld = latest_week_retrostat(users)
    return flask.jsonify(dict(latest_day=ld))


class StoreUserStatsRequest(BaseModel):
    day_stats: List[Tuple[int, List[bool]]]


@app.route("/juxtastat/store_user_stats", methods=["POST"])
@api.validate(
    headers=UserHeadersSchema,
    body=StoreUserStatsRequest,
    resp=Response(HTTP_200=EmptyResponse),
)
@authenticate()
def juxtastat_store_user_stats_request(user):
    store_user_stats(user, StoreUserStatsRequest(**flask.request.json).day_stats)
    return flask.jsonify(dict())


class HasInfiniteStatsRequest(BaseModel):
    seedVersions: List[str]


class HasInfiniteStatsResponse(BaseModel):
    has: List[bool]


@app.route("/juxtastat_infinite/has_infinite_stats", methods=["POST"])
@api.validate(
    headers=EmailHeadersSchema,
    body=HasInfiniteStatsRequest,
    resp=Response(HTTP_200=HasInfiniteStatsResponse),
)
@authenticate()
@email()
def juxtastat_infinite_has_infinite_stats_request(users):
    res = dict(
        has=has_infinite_stats(
            users, HasInfiniteStatsRequest(**flask.request.json).seedVersions
        )
    )
    return flask.jsonify(res)


class StoreInfiniteUserStatsRequest(BaseModel):
    seed: str
    version: int
    corrects: List[bool]


@app.route("/juxtastat_infinite/store_user_stats", methods=["POST"])
@api.validate(
    headers=UserHeadersSchema,
    body=StoreInfiniteUserStatsRequest,
    resp=Response(HTTP_200=EmptyResponse),
)
@authenticate()
def juxtastat_infinite_store_user_stats_request(user):
    req = StoreInfiniteUserStatsRequest(**flask.request.json)
    store_user_stats_infinite(user, req.seed, req.version, req.corrects)
    return flask.jsonify(dict())


@app.route("/retrostat/store_user_stats", methods=["POST"])
@api.validate(
    headers=UserHeadersSchema,
    body=StoreUserStatsRequest,
    resp=Response(HTTP_200=EmptyResponse),
)
@authenticate()
def retrostat_store_user_stats_request(user):
    store_user_stats_retrostat(
        user, StoreUserStatsRequest(**flask.request.json).day_stats
    )
    return flask.jsonify(dict())


class GetPerQuestionJuxtaStatsRequest(BaseModel):
    day: int


class PerQuestionResponse(BaseModel):
    total: int
    per_question: List[int]


@app.route("/juxtastat/get_per_question_stats", methods=["GET"])
@api.validate(
    query=GetPerQuestionJuxtaStatsRequest,
    resp=Response(HTTP_200=PerQuestionResponse),
)
def juxtastat_get_per_question_stats_request():
    return flask.jsonify(
        get_per_question_stats(
            GetPerQuestionJuxtaStatsRequest(**flask.request.args).day
        )
    )


class GetPerQuestionRetroStatsRequest(BaseModel):
    week: int


@app.route("/retrostat/get_per_question_stats", methods=["GET"])
@api.validate(
    query=GetPerQuestionRetroStatsRequest,
    resp=Response(HTTP_200=PerQuestionResponse),
)
def retrostat_get_per_question_stats_request():
    return flask.jsonify(
        get_per_question_stats_retrostat(
            GetPerQuestionRetroStatsRequest(**flask.request.args).week
        )
    )
