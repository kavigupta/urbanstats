from typing import Annotated, List, Literal, Optional

from pydantic import BaseModel

from ..db.friends import friend_request, infinite_results, todays_score_for, unfriend
from ..db.utils import QuizKind
from ..dependencies.authenticate import AuthenticateRequest, authenticate_responses
from ..main import app
from ..utils import Hexadecimal


class Requestee(BaseModel):
    requestee: Annotated[int, Hexadecimal]


@app.post(
    "/juxtastat/friend_request", status_code=204, responses=authenticate_responses
)
def juxtastat_friend_request(body: Requestee, req: AuthenticateRequest):
    friend_request(req, body.requestee)


@app.post("/juxtastat/unfriend", status_code=204, responses=authenticate_responses)
def juxtastat_unfriend(body: Requestee, req: AuthenticateRequest):
    unfriend(req, body.requestee)


class ScoreRequestBody(BaseModel):
    requesters: List[Annotated[int, Hexadecimal]]
    date: int
    quiz_kind: QuizKind


class NegativeResult(BaseModel):
    friends: Literal[False]


class PositiveResult(BaseModel):
    corrects: Optional[List[bool]]
    friends: Literal[True]


class ScoreResponse(BaseModel):
    results: List[NegativeResult | PositiveResult]


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
    requesters: List[Annotated[int, Hexadecimal]]
    seed: str
    version: int


class PositiveInfiniteResult(BaseModel):
    forThisSeed: Optional[int]
    maxScore: Optional[int]
    maxScoreSeed: Optional[str]
    maxScoreVersion: Optional[int]
    friends: Literal[True]


class InfiniteScoreResponse(BaseModel):
    results: List[NegativeResult | PositiveInfiniteResult]


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
