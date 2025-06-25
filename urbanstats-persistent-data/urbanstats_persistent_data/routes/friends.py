from main import app
from middleware.authenticate import authenticate
from utils import form, Hexadecimal
from pydantic import BaseModel
from typing import Annotated
from db.friends import friend_request, unfriend
from db.stats import todays_score_for
import flask
from middleware.email import email


class Requestee(BaseModel):
    requestee: Annotated[int, Hexadecimal]


@app.route("/juxtastat/friend_request", methods=["POST"])
@authenticate()
def juxtastat_friend_request(user):

    friend_request(form(Requestee).requestee, user)
    return flask.jsonify(dict())


@app.route("/juxtastat/unfriend", methods=["POST"])
@authenticate(user)
def juxtastat_unfriend(user):
    unfriend(form(Requestee).requestee, user)
    return flask.jsonify(dict())


@app.route("/juxtastat/todays_score_for", methods=["POST"])
@authenticate(["requesters", "date", "quiz_kind"])
@email()
def juxtastat_todays_score_for():
    form = flask_form()
    res = dict(
        results=todays_score_for(
            flask.request.environ["email_users"],
            form["requesters"],
            form["date"],
            form["quiz_kind"],
        )
    )
    return flask.jsonify(res)


@app.route("/juxtastat/infinite_results", methods=["POST"])
@authenticate(["requesters", "seed", "version"])
@get_email()
def juxtastat_infinite_results():
    form = flask_form()
    res = dict(
        results=infinite_results(
            flask.request.environ["email_users"],
            form["requesters"],
            form["seed"],
            form["version"],
        )
    )
    return flask.jsonify(res)
