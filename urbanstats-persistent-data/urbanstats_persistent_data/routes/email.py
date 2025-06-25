from ..db.email import associate_email_db
from ..main import app
from ..middleware.authenticate import authenticate
from ..middleware.email import get_email
from ..utils import UrbanStatsError


@app.route("/juxtastat/associate_email", methods=["POST"])
@authenticate()
def associate_email(user):
    email = get_email()
    if email is None:
        raise UrbanStatsError(400, "no email")
    associate_email_db(user, email)
    return "", 200
