import json
import os
from urllib.parse import parse_qs, urlparse

import fastapi
import fastapi.testclient
import pytest
from urbanstats_persistent_data.main import app


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

    yield app


@pytest.fixture()
# pylint: disable=redefined-outer-name,unused-argument
def client(setup_app):
    return fastapi.testclient.TestClient(app)
