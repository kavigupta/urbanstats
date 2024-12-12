import json
import flask
import hashlib

from flask_cors import CORS

from .juxtastat_stats import (
    check_secureid,
    friend_request,
    friends_status,
    get_per_question_stats,
    get_per_question_stats_retrostat,
    latest_day,
    latest_week_retrostat,
    register_user,
    store_user_stats,
    get_full_database,
    store_user_stats_retrostat,
    todays_score_for,
    unfriend,
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

    if "user" in form and "secureID" in form and "domain" in form:
        registration_error = register_user(
            form["user"], form["secureID"], form["domain"]
        )
        return flask.jsonify(dict(registration_error=registration_error))
    return flask.jsonify({"error": "Needs parameters user, secureID, and domain!"}), 200


def get_authenticated_user(additional_required_params=()):
    form = flask_form()

    required_params = ["user", "secureID"] + list(additional_required_params)

    if not all([param in form for param in required_params]):
        return False, (
            flask.jsonify({"error": f"Needs parameters {required_params}!"}),
            200,
        )
    if not check_secureid(form["user"], form["secureID"]):
        return False, (flask.jsonify({"error": "Invalid secureID!"}), 200)
    return True, None


@app.route("/juxtastat/latest_day", methods=["POST"])
def juxtastat_latest_day_request():
    form = flask_form()
    success, error = get_authenticated_user()
    if not success:
        return error
    ld = latest_day(form["user"])
    return flask.jsonify(dict(latest_day=ld))


@app.route("/retrostat/latest_week", methods=["POST"])
def retrostat_latest_week_request():
    form = flask_form()
    success, error = get_authenticated_user()
    if not success:
        return error
    ld = latest_week_retrostat(form["user"])
    return flask.jsonify(dict(latest_day=ld))


@app.route("/juxtastat/store_user_stats", methods=["POST"])
def juxtastat_store_user_stats_request():
    form = flask_form()
    success, error = get_authenticated_user(["day_stats"])
    if not success:
        return error
    store_user_stats(form["user"], json.loads(form["day_stats"]))
    return flask.jsonify(dict())


@app.route("/retrostat/store_user_stats", methods=["POST"])
def retrostat_store_user_stats_request():
    form = flask_form()

    success, error = get_authenticated_user(["day_stats"])
    if not success:
        return error
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


@app.route("/juxtastat/friend_request", methods=["POST"])
def juxtastat_friend_request():
    print("FRIEND REQUEST")
    print(flask_form())
    success, error = get_authenticated_user(["user", "requestee"])
    if not success:
        return error
    form = flask_form()
    friend_request(form["requestee"], form["user"])
    return flask.jsonify(dict())


@app.route("/juxtastat/unfriend", methods=["POST"])
def juxtastat_unfriend():
    success, error = get_authenticated_user(["user", "requestee"])
    if not success:
        return error
    form = flask_form()
    unfriend(form["requestee"], form["user"])
    return flask.jsonify(dict())


@app.route("/juxtastat/todays_score_for", methods=["POST"])
def juxtastat_todays_score_for():
    success, error = get_authenticated_user(["requesters", "date", "quiz_kind"])
    if not success:
        return error
    form = flask_form()
    res = dict(results=todays_score_for(form["user"], form["requesters"], form["date"], form["quiz_kind"]))
    print("TODAYS SCORE FOR", res)
    return flask.jsonify(res)


@app.route("/juxtastat/friends_status", methods=["POST"])
def juxtastat_friends_status():
    print("FRIENDS STATUS")
    print(flask_form())
    success, error = get_authenticated_user(["user"])
    if not success:
        return error
    form = flask_form()
    result = dict(results=friends_status(form["user"]))
    print("FRIENDS STATUS RESULT", result)
    return flask.jsonify(result)


import logging

logging.getLogger("flask_cors").level = logging.DEBUG


if __name__ == "__main__":
    app.run(debug=True)
