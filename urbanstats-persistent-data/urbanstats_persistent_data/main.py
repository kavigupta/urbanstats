import functools
import json
import logging
import requests

import flask
from flask_cors import CORS

from .juxtastat_stats import (
    check_secureid,
    friend_request,
    get_full_database,
    get_per_question_stats,
    get_per_question_stats_retrostat,
    has_infinite_stats,
    infinite_results,
    latest_day,
    latest_week_retrostat,
    register_user,
    store_user_stats,
    store_user_stats_infinite,
    store_user_stats_retrostat,
    todays_score_for,
    unfriend,
    associate_email_db,
    get_email_users,
)
from utils import error
import pydantic

app = flask.Flask("urbanstats-persistent-data")
cors = CORS(app)


@app.errorhandler(pydantic.ValidationError)
def handle_validation_error(e):
    return error(400, str(e), "validation")


import routes


@app.route("/juxtastat/friend_request", methods=["POST"])
@authenticate(["requestee"])
def juxtastat_friend_request():
    form = flask_form()
    friend_request(form["requestee"], form["user"])
    return flask.jsonify(dict())


@app.route("/juxtastat/unfriend", methods=["POST"])
@authenticate(["requestee"])
def juxtastat_unfriend():
    form = flask_form()
    unfriend(form["requestee"], form["user"])
    return flask.jsonify(dict())


@app.route("/juxtastat/todays_score_for", methods=["POST"])
@authenticate(["requesters", "date", "quiz_kind"])
@get_email()
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


@app.route("/juxtastat/associate_email", methods=["POST"])
@authenticate([])
@get_email(require_association=False)
def associate_email():
    form = flask_form()
    user = form["user"]
    email = flask.request.environ["email"]
    if email is None:
        return flask.jsonify({"error": "no email"}), 400
    return associate_email_db(user, email)


logging.getLogger("flask_cors").level = logging.DEBUG


if __name__ == "__main__":
    app.run(debug=True)
