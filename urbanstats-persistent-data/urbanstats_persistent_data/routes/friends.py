from main import app
from middleware.authenticate import authenticate
from utils import form, Hexadecimal
from pydantic import BaseModel
from typing import Annotated, List
from db.friends import friend_request, unfriend, todays_score_for, infinite_results
import flask
from middleware.email import email
from db.utils import QuizKind


class Requestee(BaseModel):
    requestee: Annotated[int, Hexadecimal]


@app.route("/juxtastat/friend_request", methods=["POST"])
@authenticate()
def juxtastat_friend_request(user):

    friend_request(form(Requestee).requestee, user)
    return flask.jsonify(dict())


@app.route("/juxtastat/unfriend", methods=["POST"])
@authenticate()
def juxtastat_unfriend(user):
    unfriend(form(Requestee).requestee, user)
    return flask.jsonify(dict())


@app.route("/juxtastat/todays_score_for", methods=["POST"])
@authenticate(["requesters", "date", "quiz_kind"])
@email()
def juxtastat_todays_score_for(users):
    class Request(BaseModel):
        requesters: List[Annotated[int, Hexadecimal]]
        date: int
        quiz_kind: QuizKind

    req = form(Request)
    res = dict(
        results=todays_score_for(
            users,
            req.requesters,
            req.date,
            req.quiz_kind,
        )
    )
    return flask.jsonify(res)


@app.route("/juxtastat/infinite_results", methods=["POST"])
@authenticate(["requesters", "seed", "version"])
@email()
def juxtastat_infinite_results(users):
    class Request(BaseModel):
        requesters: List[Annotated[int, Hexadecimal]]
        seed: str
        version: int

    req = form(Request)

    res = dict(
        results=infinite_results(
            users,
            req.requesters,
            req.seed,
            req.version,
        )
    )
    return flask.jsonify(res)
