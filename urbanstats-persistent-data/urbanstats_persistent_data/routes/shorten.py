from main import app
from db.shorten import retreive_and_lengthen, shorten_and_save
from utils import flask_form
import flask
from pydantic import BaseModel


@app.route("/shorten", methods=["POST"])
def shorten_request():
    class FullText(BaseModel):
        full_text: str

    full_text = FullText(flask_form()).full_text

    shortened = shorten_and_save(full_text)
    return flask.jsonify(dict(shortened=shortened))


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
        return flask.jsonify({"error": "Shortened text not found!"}), 404
    url = "https://urbanstats.org/" + post_url[0]
    return flask.redirect(url)
