import flask
from pydantic import BaseModel

from ..db.shorten import retreive_and_lengthen, shorten_and_save
from ..main import app, api
from ..utils import UrbanStatsError, UrbanStatsErrorModel

from flask_pydantic_spec import Response


class FullText(BaseModel):
    full_text: str


class Shortened(BaseModel):
    shortened: str


@app.route("/shorten", methods=["POST"])
@api.validate(body=FullText, resp=Response(HTTP_200=Shortened))
def shorten_request():

    full_text = FullText(**flask.request.json).full_text

    shortened = shorten_and_save(full_text)
    return flask.jsonify(dict(shortened=shortened))


@app.route("/lengthen", methods=["GET"])
@api.validate(
    query=Shortened, resp=Response(HTTP_200=FullText, HTTP_404=UrbanStatsErrorModel)
)
def lengthen_request():

    full_text = retreive_and_lengthen(Shortened(**flask.request.args).shortened)
    if full_text is None:
        raise UrbanStatsError(404, "Shortened text not found!")
    return flask.jsonify(dict(full_text=full_text[0]))


class S(BaseModel):
    c: str


@app.route("/s", methods=["GET"])
@api.validate(query=S, resp=Response("HTTP_302", HTTP_404=UrbanStatsErrorModel))
def s():
    post_url = retreive_and_lengthen(S(**flask.request.args).c)
    if post_url is None:
        raise UrbanStatsError(404, "Shortened text not found!")
    url = "https://urbanstats.org/" + post_url[0]
    return flask.redirect(url)
