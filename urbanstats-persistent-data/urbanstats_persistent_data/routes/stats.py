from main import app
from middleware.authenticate import authenticate
from utils import flask_form
import marshmallow as ma
from db.stats import (
    register_user,
    latest_day,
    latest_week_retrostat,
    store_user_stats,
    has_infinite_stats,
)
import flask
from middleware.email import email
import json


@app.route("/juxtastat/register_user", methods=["POST"])
@authenticate()
def juxtastat_register_user_request(user):
    class DomainSchema(ma.Schema):
        domain = ma.fields.Str(required=True)

    form = DomainSchema().load(flask_form())
    register_user(user, form["domain"])
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



@app.route("/juxtastat/store_user_stats", methods=["POST"])
@authenticate()
def juxtastat_store_user_stats_request(user):
    class 
    form = flask_form()
    store_user_stats(user, json.loads(form["day_stats"]))
    return flask.jsonify(dict())


@app.route("/juxtastat_infinite/has_infinite_stats", methods=["POST"])
@authenticate(["seedVersions"])
@get_email()
def juxtastat_infinite_has_infinite_stats_request():
    form = flask_form()
    res = dict(
        has=has_infinite_stats(
            flask.request.environ["email_users"], form["seedVersions"]
        )
    )
    return flask.jsonify(res)


@app.route("/juxtastat_infinite/store_user_stats", methods=["POST"])
@authenticate(["seed", "version", "corrects"])
def juxtastat_infinite_store_user_stats_request():
    form = flask_form()
    store_user_stats_infinite(
        form["user"], form["seed"], form["version"], form["corrects"]
    )
    return flask.jsonify(dict())


@app.route("/retrostat/store_user_stats", methods=["POST"])
@authenticate(["day_stats"])
def retrostat_store_user_stats_request():
    form = flask_form()
    store_user_stats_retrostat(form["user"], json.loads(form["day_stats"]))
    return flask.jsonify(dict())


@app.route("/juxtastat/get_full_database", methods=["POST"])
def juxtastat_get_full_database_request():
    form = flask_form()
    if "token" not in form or not valid_token(form["token"]):
        return (
            flask.jsonify(
                {"error": "This method requires a token, and your token is invalid!"}
            ),
            200,
        )
    return flask.jsonify(get_full_database())


@app.route("/juxtastat/get_per_question_stats", methods=["POST"])
def juxtastat_get_per_question_stats_request():
    form = flask_form()

    if "day" in form:
        return flask.jsonify(get_per_question_stats(form["day"]))
    return flask.jsonify({"error": "Needs parameter day!"}), 200


@app.route("/retrostat/get_per_question_stats", methods=["POST"])
def retrostat_get_per_question_stats_request():
    form = flask_form()

    if "week" in form:
        return flask.jsonify(get_per_question_stats_retrostat(form["week"]))
    return flask.jsonify({"error": "Needs parameter week!"}), 200
