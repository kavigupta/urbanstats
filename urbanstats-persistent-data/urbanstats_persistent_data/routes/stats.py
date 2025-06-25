from main import app
from middleware.authenticate import authenticate
from utils import form
from pydantic import BaseModel
from db.stats import (
    register_user,
    latest_day,
    latest_week_retrostat,
    store_user_stats,
    has_infinite_stats,
    store_user_stats_infinite,
    store_user_stats_retrostat,
    get_per_question_stats,
    get_per_question_stats_retrostat,
)
import flask
from middleware.email import email
import json
from typing import List, Tuple


@app.route("/juxtastat/register_user", methods=["POST"])
@authenticate()
def juxtastat_register_user_request(user):
    class DomainSchema(BaseModel):
        domain: str

    register_user(user, form(DomainSchema).domain)
    return flask.jsonify(dict()), 200


@app.route("/juxtastat/latest_day", methods=["POST"])
@authenticate()
@email()
def juxtastat_latest_day_request(users):
    ld = latest_day(users)
    return flask.jsonify(dict(latest_day=ld))


@app.route("/retrostat/latest_week", methods=["POST"])
@authenticate()
@email()
def retrostat_latest_week_request(users):
    ld = latest_week_retrostat(users)
    return flask.jsonify(dict(latest_day=ld))


class DayStatsSchema(BaseModel):
    day_stats: List[Tuple[int, List[bool]]]


@app.route("/juxtastat/store_user_stats", methods=["POST"])
@authenticate()
def juxtastat_store_user_stats_request(user):
    store_user_stats(user, form(DayStatsSchema).day_stats)
    return flask.jsonify(dict())


@app.route("/juxtastat_infinite/has_infinite_stats", methods=["POST"])
@authenticate()
@email()
def juxtastat_infinite_has_infinite_stats_request(users):

    class SeedVersions(BaseModel):
        seedVersions: List[str]

    res = dict(has=has_infinite_stats(users, form(SeedVersions).seedVersions))
    return flask.jsonify(res)


@app.route("/juxtastat_infinite/store_user_stats", methods=["POST"])
@authenticate()
def juxtastat_infinite_store_user_stats_request(user):
    class Request(BaseModel):
        seed: str
        version: int
        corrects: List[bool]

    req = form(Request)
    store_user_stats_infinite(user, req.seed, req.version, req.corrects)
    return flask.jsonify(dict())


@app.route("/retrostat/store_user_stats", methods=["POST"])
@authenticate()
def retrostat_store_user_stats_request(user):
    store_user_stats_retrostat(user, form(DayStatsSchema).day_stats)
    return flask.jsonify(dict())


@app.route("/juxtastat/get_per_question_stats", methods=["GET"])
def juxtastat_get_per_question_stats_request():
    class Day(BaseModel):
        day: int

    return flask.jsonify(get_per_question_stats(Day(**flask.request.args).day))


@app.route("/retrostat/get_per_question_stats", methods=["GET"])
def retrostat_get_per_question_stats_request():
    class Week(BaseModel):
        week: int

    return flask.jsonify(
        get_per_question_stats_retrostat(Week(**flask.request.args).week)
    )
