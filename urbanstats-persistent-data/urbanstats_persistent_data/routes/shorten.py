import fastapi
from pydantic import BaseModel

from ..db.shorten import retreive_and_lengthen, shorten_and_save
from ..dependencies.db_session import GetDbSession
from ..main import app
from ..utils import HTTPExceptionModel


class FullText(BaseModel):
    full_text: str


class Shortened(BaseModel):
    shortened: str


@app.post("/shorten")
def shorten_request(s: GetDbSession, body: FullText) -> Shortened:
    return Shortened(shortened=shorten_and_save(s, body.full_text))


@app.get("/lengthen", responses={404: {"model": HTTPExceptionModel}})
def lengthen_request(s: GetDbSession, shortened: str) -> FullText:
    full_text = retreive_and_lengthen(s, shortened)
    if full_text is None:
        raise fastapi.HTTPException(404, "Shortened text not found!")
    return FullText(full_text=full_text[0])


@app.get("/s", status_code=302, responses={404: {"model": HTTPExceptionModel}})
def route_s(s: GetDbSession, c: str):
    post_url = retreive_and_lengthen(s, c)
    if post_url is None:
        raise fastapi.HTTPException(404, "Shortened text not found!")
    url = "https://urbanstats.org/" + post_url[0]
    return fastapi.responses.RedirectResponse(url, status_code=302)
