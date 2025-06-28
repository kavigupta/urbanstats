import typing as t

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
from ..dependencies.authenticate import AuthenticateRequest
from ..dependencies.db_session import GetDbSession
from ..main import app


class RegisterBody(BaseModel):
    domain: str


@app.post("/juxtastat/register_user")
def juxtastat_register_user_request(
    req: AuthenticateRequest,
    body: RegisterBody,
):
    register_user(req, body.domain)


class LatestDayResponse(BaseModel):
    latest_day: int


@app.get("/juxtastat/latest_day")
def juxtastat_latest_day_request(
    req: AuthenticateRequest,
) -> LatestDayResponse:
    ld = latest_day(req)
    return LatestDayResponse(latest_day=ld)


@app.get("/retrostat/latest_week")
def retrostat_latest_week_request(
    req: AuthenticateRequest,
) -> LatestDayResponse:
    ld = latest_week_retrostat(req)
    return LatestDayResponse(latest_day=ld)


class StoreUserStatsBody(BaseModel):
    day_stats: t.List[t.Tuple[int, t.List[bool]]]


@app.post("/juxtastat/store_user_stats")
def juxtastat_store_user_stats_request(
    req: AuthenticateRequest, body: StoreUserStatsBody
):
    store_user_stats(req, body.day_stats)


class HasInfiniteStatsBody(BaseModel):
    seedVersions: t.List[t.Tuple[str, int]]


class HasInfiniteStatsResponse(BaseModel):
    has: t.List[bool]


@app.post("/juxtastat_infinite/has_infinite_stats")
def juxtastat_infinite_has_infinite_stats_request(
    req: AuthenticateRequest, body: HasInfiniteStatsBody
) -> HasInfiniteStatsResponse:
    return HasInfiniteStatsResponse(has=has_infinite_stats(req, body.seedVersions))


class StoreInfiniteUserStatsBody(BaseModel):
    seed: str
    version: int
    corrects: t.List[bool]


@app.post("/juxtastat_infinite/store_user_stats")
def juxtastat_infinite_store_user_stats_request(
    req: AuthenticateRequest, body: StoreInfiniteUserStatsBody
):
    store_user_stats_infinite(req, body.seed, body.version, body.corrects)


@app.post("/retrostat/store_user_stats")
def retrostat_store_user_stats_request(
    req: AuthenticateRequest, body: StoreUserStatsBody
):
    store_user_stats_retrostat(req, body.day_stats)


class PerQuestionResponse(BaseModel):
    total: int
    per_question: t.List[int]


@app.get("/juxtastat/get_per_question_stats")
def juxtastat_get_per_question_stats_request(
    s: GetDbSession, day: int
) -> PerQuestionResponse:
    return get_per_question_stats(s, day)


class GetPerQuestionRetroStatsRequest(BaseModel):
    week: int


@app.get("/retrostat/get_per_question_stats")
def retrostat_get_per_question_stats_request(
    s: GetDbSession, week: int
) -> PerQuestionResponse:
    return get_per_question_stats_retrostat(s, week)
