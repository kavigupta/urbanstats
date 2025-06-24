import pytest


def test_register_user(client):
    response = client.post(
        "/juxtastat/register_user",
        data={
            "user": "1",
            "domain": "test.urbanstats.org",
        },
    )
    assert response.status_code == 200


def test_get_latest_day(client):
    response = client.post(
        "/juxtastat/latest_day", data={"user": "1", "secureID": "11"}
    )
    assert response.status_code == 200
    assert response.json == {"latest_day": -100}


def test_get_latest_week(client):
    response = client.post(
        "/retrostat/latest_week", data={"user": "1", "secureID": "11"}
    )
    assert response.status_code == 200
    assert response.json == {"latest_day": -100}


def test_store_user_stats_success(client):
    response = client.post(
        "/juxtastat/store_user_stats",
        json={
            "user": "1",
            "secureID": "11",
            "day_stats": "[[1, [true, true, true, true, true]]]",
        },
    )
    assert response.status_code == 200
    assert response.json == {}

    response = client.post(
        "/juxtastat/latest_day", data={"user": "1", "secureID": "11"}
    )
    assert response.status_code == 200
    assert response.json == {"latest_day": 1}


def test_store_user_stats_missing_fields(client):
    response = client.post(
        "/juxtastat/store_user_stats",
        data={
            "user": "1",
            "secureID": "11",
            # missing day_stats
        },
    )
    assert response.status_code == 200
    assert response.json == {
        "code": "needs_params",
        "error": "Needs parameters ['user', 'secureID', 'day_stats']!",
    }


def test_store_user_stats_invalid_secureid(client):
    response = client.post(
        "/juxtastat/store_user_stats",
        data={
            "user": "1",
            "secureID": "11",
            "day_stats": "[[1, [true, true, true, true, true]]]",
        },
    )
    assert response.status_code == 200
    assert response.json == {}

    response = client.post(
        "/juxtastat/store_user_stats",
        data={
            "user": "1",
            "secureID": "12",
            "day_stats": "[[1, [true, true, true, true, true]]]",
        },
    )
    assert response.status_code == 200
    assert response.json == {"code": "bad_secureid", "error": "Invalid secureID!"}
