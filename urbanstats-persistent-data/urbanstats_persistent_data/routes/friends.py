from typing import Annotated, List, Optional

from pydantic import BaseModel

from ..db.friends import friend_request, infinite_results, todays_score_for, unfriend
from ..db.utils import QuizKind
from ..dependencies.authenticate import AuthenticateRequest
from ..main import app
from ..utils import Hexadecimal


class Requestee(BaseModel):
    requestee: Annotated[int, Hexadecimal]


@app.post("/juxtastat/friend_request")
def juxtastat_friend_request(body: Requestee, req: AuthenticateRequest):
    friend_request(req, body.requestee)


@app.post("/juxtastat/unfriend")
def juxtastat_unfriend(body: Requestee, req: AuthenticateRequest):
    unfriend(req, body.requestee)


class ScoreRequestBody(BaseModel):
    requesters: List[Annotated[int, Hexadecimal]]
    date: int
    quiz_kind: QuizKind


class Result(BaseModel):
    corrects: Optional[List[bool]] = None
    friends: bool


class ScoreResponse(BaseModel):
    results: List[Result]


@app.post("/juxtastat/todays_score_for")
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


class InfiniteResult(BaseModel):
    forThisSeed: Optional[int] = None
    maxScore: Optional[int] = None
    maxScoreSeed: Optional[str] = None
    maxScoreVersion: Optional[int] = None
    friends: bool


class InfiniteScoreResponse(BaseModel):
    results: List[InfiniteResult]


@app.post("/juxtastat/infinite_results")
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
