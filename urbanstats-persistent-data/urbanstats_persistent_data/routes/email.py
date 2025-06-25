from ..db.email import associate_email_db
from ..main import app, api
from ..middleware.authenticate import authenticate
from ..middleware.email import get_email, EmailHeadersSchema
from ..utils import UrbanStatsError, UrbanStatsErrorModel, EmptyResponse
from flask_pydantic_spec import Response
import flask


@app.route("/juxtastat/associate_email", methods=["POST"])
@api.validate(
    headers=EmailHeadersSchema,
    resp=Response(HTTP_200=EmptyResponse, HTTP_400=UrbanStatsErrorModel),
)
@authenticate()
def associate_email(user):
    email = get_email()
    if email is None:
        raise UrbanStatsError(400, "no email")
    associate_email_db(user, email)
    return flask.jsonify({}), 200
