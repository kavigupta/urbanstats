from ..main import app
from ..middleware.authenticate import authenticate
from ..middleware.email import email
from ..utils import error
from ..db.email import associate_email_db


@app.route("/juxtastat/associate_email", methods=["POST"])
@authenticate()
@email(require_association=False)
def associate_email(users, email):
    if email is None:
        return error(400, "no email")
    return associate_email_db(users[0], email)
