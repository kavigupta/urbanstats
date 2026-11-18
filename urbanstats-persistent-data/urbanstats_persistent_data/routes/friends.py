import typing as t

from pydantic import BaseModel, EmailStr

from ..db.friends import (
    Corrects,
    FriendSummaryStats,
    InfiniteResult,
    NegativeResult,
    friend_request,
    friend_summary_stats,
    infinite_results,
    todays_score_for,
    unfriend,
)
from ..db.utils import QuizKind
from ..dependencies.authenticate import AuthenticateRequest, authenticate_responses
from ..main import app
from ..utils import Hexadecimal


class Requestee(BaseModel):
    requestee: t.Annotated[int, Hexadecimal] | EmailStr


@app.post(
    "/juxtastat/friend_request", status_code=204, responses=authenticate_responses
)
def juxtastat_friend_request(body: Requestee, req: AuthenticateRequest) -> None:
    friend_request(req, body.requestee)


@app.post("/juxtastat/unfriend", status_code=204, responses=authenticate_responses)
def juxtastat_unfriend(body: Requestee, req: AuthenticateRequest) -> None:
    unfriend(req, body.requestee)


class ScoreRequestBody(BaseModel):
    requesters: t.List[t.Annotated[int, Hexadecimal] | EmailStr]
    date: int
    quiz_kind: QuizKind


class ScoreResponse(BaseModel):
    results: t.List[NegativeResult | Corrects]


@app.post("/juxtastat/todays_score_for", responses=authenticate_responses)
def juxtastat_todays_score_for(
    req: AuthenticateRequest, body: ScoreRequestBody
) -> ScoreResponse:
    return ScoreResponse(
        results=todays_score_for(
            req,
            body.requesters,
            body.date,
            body.quiz_kind,
        )
    )


class InfiniteScoreRequestBody(BaseModel):
    requesters: t.List[t.Annotated[int, Hexadecimal] | EmailStr]
    seed: str
    version: int


class InfiniteScoreResponse(BaseModel):
    results: t.List[NegativeResult | InfiniteResult]


@app.post("/juxtastat/infinite_results", responses=authenticate_responses)
def juxtastat_infinite_results(
    req: AuthenticateRequest, body: InfiniteScoreRequestBody
) -> InfiniteScoreResponse:
    return InfiniteScoreResponse(
        results=infinite_results(
            req,
            body.requesters,
            body.seed,
            body.version,
        )
    )


class FriendSummaryStatsRequestBody(BaseModel):
    requesters: t.List[t.Annotated[int, Hexadecimal] | EmailStr]
    quiz_kind: QuizKind


class FriendSummaryStatsResponse(BaseModel):
    results: t.List[NegativeResult | FriendSummaryStats]


@app.post("/juxtastat/friend_summary_stats", responses=authenticate_responses)
def juxtastat_friend_summary_stats(
    req: AuthenticateRequest, body: FriendSummaryStatsRequestBody
) -> FriendSummaryStatsResponse:
    return FriendSummaryStatsResponse(
        results=friend_summary_stats(
            req,
            body.requesters,
            body.quiz_kind,
        )
    )
