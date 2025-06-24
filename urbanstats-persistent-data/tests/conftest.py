import pytest
from urbanstats_persistent_data.main import app
import os
from urllib.parse import urlparse, parse_qs
import json


@pytest.fixture()
def setup_app(mocker):

    def mock_get(url):
        parsed_url = urlparse(url)
        params = parse_qs(parsed_url.query)
        access_token = params.get("access_token", [None])[0]

        class MockResponse:
            status_code = 200
            content = json.dumps({"email": access_token})

        return MockResponse()

    mocker.patch("requests.get", mock_get)

    db_path = os.path.join(os.path.dirname(__file__), "..", "db.sqlite3")
    if os.path.exists(db_path):
        os.remove(db_path)

    app.config.update(
        {
            "TESTING": True,
        }
    )

    yield app


@pytest.fixture()
def client(setup_app):
    return setup_app.test_client()


@pytest.fixture()
def runner(setup_app):
    return setup_app.test_cli_runner()
