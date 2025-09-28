import typing as t

from pydantic import BaseModel

from ..db.stats import (
    PerQuestionStats,
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
from ..dependencies.authenticate import AuthenticateRequest, authenticate_responses
from ..dependencies.db_session import GetDbSession
from ..main import app


class RegisterBody(BaseModel):
    domain: str


@app.post("/juxtastat/register_user", status_code=204, responses=authenticate_responses)
def juxtastat_register_user_request(
    req: AuthenticateRequest,
    body: RegisterBody,
) -> None:
    register_user(req, body.domain)


class LatestDayResponse(BaseModel):
    latest_day: int


@app.get("/juxtastat/latest_day", responses=authenticate_responses)
def juxtastat_latest_day_request(
    req: AuthenticateRequest,
) -> LatestDayResponse:
    ld = latest_day(req)
    return LatestDayResponse(latest_day=ld)


@app.get("/retrostat/latest_week", responses=authenticate_responses)
def retrostat_latest_week_request(
    req: AuthenticateRequest,
) -> LatestDayResponse:
    ld = latest_week_retrostat(req)
    return LatestDayResponse(latest_day=ld)


class StoreUserStatsBody(BaseModel):
    day_stats: t.List[t.Tuple[int, t.List[bool]]]


@app.post(
    "/juxtastat/store_user_stats", status_code=204, responses=authenticate_responses
)
def juxtastat_store_user_stats_request(
    req: AuthenticateRequest, body: StoreUserStatsBody
) -> None:
    store_user_stats(req, body.day_stats)


class HasInfiniteStatsBody(BaseModel):
    seedVersions: t.List[t.Tuple[str, int]]


class HasInfiniteStatsResponse(BaseModel):
    has: t.List[bool]  # vulture: ignore -- used by the client


@app.post("/juxtastat_infinite/has_infinite_stats", responses=authenticate_responses)
def juxtastat_infinite_has_infinite_stats_request(
    req: AuthenticateRequest, body: HasInfiniteStatsBody
) -> HasInfiniteStatsResponse:
    return HasInfiniteStatsResponse(has=has_infinite_stats(req, body.seedVersions))


class StoreInfiniteUserStatsBody(BaseModel):
    seed: str
    version: int
    corrects: t.List[bool]


@app.post(
    "/juxtastat_infinite/store_user_stats",
    status_code=204,
    responses=authenticate_responses,
)
def juxtastat_infinite_store_user_stats_request(
    req: AuthenticateRequest, body: StoreInfiniteUserStatsBody
) -> None:
    store_user_stats_infinite(req, body.seed, body.version, body.corrects)


@app.post(
    "/retrostat/store_user_stats", status_code=204, responses=authenticate_responses
)
def retrostat_store_user_stats_request(
    req: AuthenticateRequest, body: StoreUserStatsBody
) -> None:
    store_user_stats_retrostat(req, body.day_stats)


@app.get("/juxtastat/get_per_question_stats")
def juxtastat_get_per_question_stats_request(
    s: GetDbSession, day: int
) -> PerQuestionStats:
    return get_per_question_stats(s, day)


class GetPerQuestionRetroStatsRequest(BaseModel):
    week: int


@app.get("/retrostat/get_per_question_stats")
def retrostat_get_per_question_stats_request(
    s: GetDbSession, week: int
) -> PerQuestionStats:
    return get_per_question_stats_retrostat(s, week)
