import functools
import json
import flask
import hashlib

from flask_cors import CORS

from .juxtastat_stats import (
    check_secureid,
    friend_request,
    get_per_question_stats,
    get_per_question_stats_retrostat,
    has_infinite_stats,
    infinite_results,
    latest_day,
    latest_week_retrostat,
    register_user,
    store_user_stats,
    get_full_database,
    store_user_stats_infinite,
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


@app.route("/s", methods=["GET"])
def s():
    c = flask.request.args.get("c")
    post_url = retreive_and_lengthen(c)
    if post_url is None:
        print("Shortened text not found!")
        return flask.jsonify({"error": "Shortened text not found!"}), 404
    url = "https://urbanstats.org/" + post_url[0]
    return flask.redirect(url)


def get_authenticated_user(additional_required_params=()):
    form = flask_form()

    required_params = ["user", "secureID"] + list(additional_required_params)

    if not all([param in form for param in required_params]):
        print("NEEDS PARAMS", required_params, "GOT", form.keys())
        return False, (
            flask.jsonify(
                {
                    "error": f"Needs parameters {required_params}!",
                    "code": "needs_params",
                }
            ),
            200,
        )
    if not check_secureid(form["user"], form["secureID"]):
        return False, (
            flask.jsonify({"error": "Invalid secureID!", "code": "bad_secureid"}),
            200,
        )
    return True, None


def authenticate(fields):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper():
            print("AUTHENTICATE", flask_form())
            success, error = get_authenticated_user(fields)
            if not success:
                print("AUTHENTICATE ERROR", error)
                return error
            return fn()

        return wrapper

    return decorator


@app.route("/juxtastat/register_user", methods=["POST"])
@authenticate(["domain"])
def juxtastat_register_user_request():
    form = flask_form()

    print("RECV", form)

    register_user(form["user"], form["domain"])
    return flask.jsonify(dict()), 200


@app.route("/juxtastat/latest_day", methods=["POST"])
@authenticate([])
def juxtastat_latest_day_request():
    form = flask_form()
    ld = latest_day(form["user"])
    return flask.jsonify(dict(latest_day=ld))


@app.route("/retrostat/latest_week", methods=["POST"])
@authenticate([])
def retrostat_latest_week_request():
    form = flask_form()
    ld = latest_week_retrostat(form["user"])
    return flask.jsonify(dict(latest_day=ld))


@app.route("/juxtastat/store_user_stats", methods=["POST"])
@authenticate(["day_stats"])
def juxtastat_store_user_stats_request():
    form = flask_form()
    store_user_stats(form["user"], json.loads(form["day_stats"]))
    return flask.jsonify(dict())


@app.route("/juxtastat_infinite/has_infinite_stats", methods=["POST"])
@authenticate(["seedVersions"])
def juxtastat_infinite_has_infinite_stats_request():
    form = flask_form()
    print("HAS INFINITE STATS", form)
    res = dict(has=has_infinite_stats(form["user"], form["seedVersions"]))
    print("HAS INFINITE STATS", res)
    return flask.jsonify(
        res
    )


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


@app.route("/juxtastat/friend_request", methods=["POST"])
@authenticate(["requestee"])
def juxtastat_friend_request():
    print("FRIEND REQUEST")
    print(flask_form())
    form = flask_form()
    friend_request(form["requestee"], form["user"])
    return flask.jsonify(dict())


@app.route("/juxtastat/unfriend", methods=["POST"])
@authenticate(["requestee"])
def juxtastat_unfriend():
    form = flask_form()
    print("unfriend initiated", form)
    unfriend(form["requestee"], form["user"])
    return flask.jsonify(dict())


@app.route("/juxtastat/todays_score_for", methods=["POST"])
@authenticate(["requesters", "date", "quiz_kind"])
def juxtastat_todays_score_for():
    form = flask_form()
    res = dict(
        results=todays_score_for(
            form["user"], form["requesters"], form["date"], form["quiz_kind"]
        )
    )
    print("TODAYS SCORE FOR", res)
    return flask.jsonify(res)


@app.route("/juxtastat/infinite_results", methods=["POST"])
@authenticate(["requesters", "seed", "version"])
def juxtastat_infinite_results():
    form = flask_form()
    res = dict(
        results=infinite_results(
            form["user"], form["requesters"], form["seed"], form["version"]
        )
    )
    print("INFINITE RESULTS FOR", res)
    return flask.jsonify(res)


import logging

logging.getLogger("flask_cors").level = logging.DEBUG


if __name__ == "__main__":
    app.run(debug=True)
