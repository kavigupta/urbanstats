import flask
import requests
from flask_pydantic_spec import Response
from pydantic import BaseModel
import json

from ..db.email import associate_email_db
from ..main import api, app
from ..middleware.authenticate import authenticate, UserHeadersSchema
from ..utils import EmptyResponse, UrbanStatsError, UrbanStatsErrorModel


class AssociateEmailRequest(BaseModel):
    token: str


@app.route("/juxtastat/associate_email", methods=["POST"])
@api.validate(
    body=AssociateEmailRequest,
    headers=UserHeadersSchema,
    resp=Response(HTTP_200=EmptyResponse, HTTP_400=UrbanStatsErrorModel),
)
@authenticate()
def associate_email(user, users):
    email = get_email(AssociateEmailRequest(**flask.request.json).token)
    associate_email_db(user, email)
    return flask.jsonify({}), 200


def get_email(token):
    response = requests.get(
        f"https://oauth2.googleapis.com/tokeninfo?access_token={token}"
    )
    if response.status_code // 100 == 4:
        raise UrbanStatsError(401, "Couldn't validate access token", "access_token")
    elif response.status_code != 200:
        raise UrbanStatsError(500, "Couldn't communicate successfully with Google")

    class InfoSchema(BaseModel):
        email: str

    try:
        info = InfoSchema(**json.loads(response.content))
        return info.email
    except Exception as exc:
        raise UrbanStatsError(500, "Invalid response from Google") from exc
