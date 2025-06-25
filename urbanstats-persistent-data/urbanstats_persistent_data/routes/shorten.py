from main import app
from db.shorten import retreive_and_lengthen, shorten_and_save
from utils import form, error
import flask
from pydantic import BaseModel


@app.route("/shorten", methods=["POST"])
def shorten_request():
    class FullText(BaseModel):
        full_text: str

    full_text = form(FullText).full_text

    shortened = shorten_and_save(full_text)
    return flask.jsonify(dict(shortened=shortened))


@app.route("/lengthen", methods=["POST"])
def lengthen_request():
    class Shortened(BaseModel):
        shortened: str

    full_text = retreive_and_lengthen(form(Shortened).shortened)
    if full_text is None:
        return error(404, "Shortened text not found!")
    return flask.jsonify(dict(full_text=full_text[0]))


@app.route("/s", methods=["GET"])
def s():
    c = flask.request.args.get("c")
    post_url = retreive_and_lengthen(c)
    if post_url is None:
        return flask.jsonify({"error": "Shortened text not found!"}), 404
    url = "https://urbanstats.org/" + post_url[0]
    return flask.redirect(url)
