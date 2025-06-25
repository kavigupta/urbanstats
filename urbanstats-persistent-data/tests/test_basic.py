import pytest


def test_register_user(client):
    response = client.post(
        "/juxtastat/register_user",
        headers={"x-user": "1", "x-secure-id": "11"},
        json={
            "domain": "test.urbanstats.org",
        },
    )
    assert response.status_code == 200


def test_register_no_body(client):
    response = client.post(
        "/juxtastat/register_user",
        headers={"x-user": "1", "x-secure-id": "11"},
    )
    assert response.status_code == 400
    assert response.json == {
        "code": None,
        "error": "zero-length body",
    }


def test_get_latest_day(client):
    response = client.post(
        "/juxtastat/latest_day", headers={"x-user": "1", "x-secure-id": "11"}
    )
    assert response.status_code == 200
    assert response.json == {"latest_day": -100}


def test_get_latest_week(client):
    response = client.post(
        "/retrostat/latest_week", headers={"x-user": "1", "x-secure-id": "11"}
    )
    assert response.status_code == 200
    assert response.json == {"latest_day": -100}


def test_store_user_stats_success(client):
    response = client.post(
        "/juxtastat/store_user_stats",
        headers={"x-user": "1", "x-secure-id": "11"},
        json={
            "day_stats": [[1, [True, True, True, True, True]]],
        },
    )
    assert response.json == {}
    assert response.status_code == 200

    response = client.post(
        "/juxtastat/latest_day", headers={"x-user": "1", "x-secure-id": "11"}
    )
    assert response.status_code == 200
    assert response.json == {"latest_day": 1}


def test_store_user_stats_missing_fields(client):
    response = client.post(
        "/juxtastat/store_user_stats",
        headers={
            "x-user": "1",
            "x-secure-id": "11",
        },
        json={},
    )
    assert response.status_code == 400
    assert response.json == {
        "code": "validation",
        "error": [
            {
                "input": {},
                "loc": [
                    "day_stats",
                ],
                "msg": "Field required",
                "type": "missing",
            },
        ],
    }


def test_store_user_stats_invalid_secureid(client):
    response = client.post(
        "/juxtastat/store_user_stats",
        headers={
            "x-user": "1",
            "x-secure-id": "11",
        },
        json={
            "day_stats": [[1, [True, True, True, True, True]]],
        },
    )
    assert response.status_code == 200
    assert response.json == {}

    response = client.post(
        "/juxtastat/store_user_stats",
        headers={
            "x-user": "1",
            "x-secure-id": "12",
        },
        data={
            "day_stats": "[[1, [true, true, true, true, true]]]",
        },
    )
    assert response.status_code == 401
    assert response.json == {"code": "bad_secureid", "error": "Invalid secureID!"}
