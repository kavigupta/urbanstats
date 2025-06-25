import pytest


def test_shorten(client):
    response = client.post("/shorten", json={"full_text": "some_text"})

    assert response.status_code == 200


def test_shorten_invalid(client):
    response = client.post("/shorten", json={})

    assert response.status_code == 400
    assert response.json == {
        "code": "validation",
        "error": [
            {
                "input": {},
                "loc": ["full_text"],
                "msg": "Field required",
                "type": "missing",
            }
        ],
    }
