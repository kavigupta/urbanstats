import pytest


@pytest.mark.only
def test_shorten(client):
    response = client.post("/shorten", json={"full_text": "some_text"})

    assert response.status_code == 200

    shortened = response.json()["shortened"]
    response = client.get("/lengthen", params={"shortened": shortened})

    assert response.status_code == 200
    assert response.json() == {"full_text": "some_text"}

    response = client.get("/s", params={"c": shortened}, follow_redirects=False)
    assert response.status_code == 302
    assert response.headers["Location"] == "https://urbanstats.org/some_text"


def test_shorten_invalid(client):
    response = client.post("/shorten", json={})

    assert response.status_code == 422


def test_lengthen_not_found(client):
    # Use a shortened code that does not exist in the DB
    response = client.get("/lengthen", params={"shortened": "zzz"})
    assert response.status_code == 404


def test_redirect_not_found(client):
    # Use a shortened code that does not exist in the DB
    response = client.get("/s", params={"c": "zzz"})
    assert response.status_code == 404
