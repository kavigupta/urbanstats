import logging

import flask
from flask_cors import CORS
from flask_pydantic_spec import FlaskPydanticSpec

from .utils import UrbanStatsError

app = flask.Flask("urbanstats-persistent-data")
cors = CORS(app)

api = FlaskPydanticSpec("flask", app=app)


@app.errorhandler(UrbanStatsError)
def handle_urban_stats_error(e: UrbanStatsError):
    return flask.jsonify(e.to_dict()), e.status


@app.errorhandler(Exception)
def handle_exception(_: Exception):
    return handle_urban_stats_error(
        UrbanStatsError(500, "Unexpected internal error", "internal")
    )


# pylint: disable=unused-import
from .routes import friends, get_full_database, shorten, stats

logging.getLogger("flask_cors").level = logging.DEBUG


if __name__ == "__main__":
    app.run(debug=True)
