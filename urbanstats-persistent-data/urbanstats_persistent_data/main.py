import logging

import flask
import pydantic
from flask_cors import CORS

from .utils import UrbanStatsError

app = flask.Flask("urbanstats-persistent-data")
cors = CORS(app)


@app.errorhandler(pydantic.ValidationError)
def handle_validation_error(e: pydantic.ValidationError):
    return handle_urban_stats_error(
        UrbanStatsError(400, e.errors(include_url=False), "validation")
    )


@app.errorhandler(UrbanStatsError)
def handle_urban_stats_error(e: UrbanStatsError):
    return flask.jsonify(e.to_dict()), e.status


# pylint: disable=unused-import
from .routes import email, friends, get_full_database, shorten, stats

logging.getLogger("flask_cors").level = logging.DEBUG


if __name__ == "__main__":
    app.run(debug=True)
