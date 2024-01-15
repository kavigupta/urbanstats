import json
import flask
import hashlib

from flask_cors import CORS

from .juxtastat_stats import (
    get_per_question_stats,
    get_per_question_stats_retrostat,
    latest_day,
    latest_week_retrostat,
    register_user,
    store_user_stats,
    get_full_database,
    store_user_stats_retrostat,
)
from .shorten import shorten_and_save, retreive_and_lengthen

app = flask.Flask("urbanstats-persistent-data")
cors = CORS(app)


def flask_form():
    form = flask.request.form
    if not form:
        form = json.loads(flask.request.data.decode("utf-8"))
    print(form)
    return form


def valid_token(tok):
    token_must_hash_to = {
        "d02a2a95256315523dd5740e1a4d1c00b5a69752f26f891170e8078fd37aa224",
        "5f5cf96b428467624d144bb4297ae317f564af0ef0df8e6b70d2b706823add1b",
    }
    return hashlib.sha256(tok.encode("utf-8")).hexdigest() in token_must_hash_to


@app.route("/shorten", methods=["POST"])
def shorten_request():
    form = flask_form()

    if "full_text" in form:
        shortened = shorten_and_save(form["full_text"])
        return flask.jsonify(dict(shortened=shortened))
    return flask.jsonify({"error": "Needs parameter full_text!"}), 200


@app.route("/lengthen", methods=["POST"])
def lengthen_request():
    form = flask_form()

    if "shortened" in form:
        full_text = retreive_and_lengthen(form["shortened"])
        if full_text is None:
            return flask.jsonify({"error": "Shortened text not found!"}), 404
        return flask.jsonify(dict(full_text=full_text[0]))
    return flask.jsonify({"error": "Needs parameter shortened!"}), 200


@app.route("/juxtastat/register_user", methods=["POST"])
def juxtastat_register_user_request():
    form = flask_form()

    print("RECV", form)

    if "user" in form and "domain" in form:
        register_user(form["user"], form["domain"])
        return flask.jsonify(dict(success=True))
    return flask.jsonify({"error": "Needs parameters user and domain!"}), 200


@app.route("/juxtastat/latest_day", methods=["POST"])
def juxtastat_latest_day_request():
    form = flask_form()

    if "user" in form:
        ld = latest_day(form["user"])
        return flask.jsonify(dict(latest_day=ld))
    return flask.jsonify({"error": "Needs parameter user!"}), 200


@app.route("/retrostat/latest_week", methods=["POST"])
def retrostat_latest_week_request():
    form = flask_form()

    if "user" in form:
        ld = latest_week_retrostat(form["user"])
        return flask.jsonify(dict(latest_day=ld))
    return flask.jsonify({"error": "Needs parameter user!"}), 200


@app.route("/juxtastat/store_user_stats", methods=["POST"])
def juxtastat_store_user_stats_request():
    form = flask_form()

    if "user" in form and "day_stats" in form:
        store_user_stats(form["user"], json.loads(form["day_stats"]))
        return flask.jsonify(dict(success=True))
    return flask.jsonify({"error": "Needs parameters user and day_stats!"}), 200


@app.route("/retrostat/store_user_stats", methods=["POST"])
def retrostat_store_user_stats_request():
    form = flask_form()

    if "user" in form and "day_stats" in form:
        store_user_stats_retrostat(form["user"], json.loads(form["day_stats"]))
        return flask.jsonify(dict(success=True))
    return flask.jsonify({"error": "Needs parameters user and day_stats!"}), 200


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


import logging

logging.getLogger("flask_cors").level = logging.DEBUG


if __name__ == "__main__":
    app.run(debug=True)
