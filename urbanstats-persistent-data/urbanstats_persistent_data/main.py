import logging

import flask
from flask_cors import CORS

from utils import error
import pydantic

app = flask.Flask("urbanstats-persistent-data")
cors = CORS(app)


@app.errorhandler(pydantic.ValidationError)
def handle_validation_error(e):
    return error(400, str(e), "validation")


import routes


logging.getLogger("flask_cors").level = logging.DEBUG


if __name__ == "__main__":
    app.run(debug=True)
