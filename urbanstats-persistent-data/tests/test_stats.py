identity_1 = {"x-user": "1", "x-secure-id": "11"}


def test_register_user(client):
    response = client.post(
        "/juxtastat/register_user",
        headers=identity_1,
        json={
            "domain": "test.urbanstats.org",
        },
    )
    assert response.status_code == 200


def test_register_no_body(client):
    response = client.post(
        "/juxtastat/register_user",
        headers=identity_1,
    )
    assert response.status_code == 422
    assert response.json == [
        {
            "input": {},
            "loc": [
                "domain",
            ],
            "msg": "Field required",
            "type": "missing",
            "url": "https://errors.pydantic.dev/2.11/v/missing",
        },
    ]


def test_get_latest_day(client):
    response = client.get("/juxtastat/latest_day", headers=identity_1)
    assert response.status_code == 200
    assert response.json == {"latest_day": -100}


def test_get_latest_week(client):
    response = client.get("/retrostat/latest_week", headers=identity_1)
    assert response.status_code == 200
    assert response.json == {"latest_day": -100}


def test_store_user_stats_success(client):
    response = client.post(
        "/juxtastat/store_user_stats",
        headers=identity_1,
        json={
            "day_stats": [[1, [True, True, True, True, True]]],
        },
    )
    assert response.json == {}
    assert response.status_code == 200

    response = client.get("/juxtastat/latest_day", headers=identity_1)
    assert response.status_code == 200
    assert response.json == {"latest_day": 1}


def test_store_user_stats_missing_fields(client):
    response = client.post(
        "/juxtastat/store_user_stats",
        headers=identity_1,
        json={},
    )
    assert response.status_code == 422
    assert response.json == [
        {
            "input": {},
            "loc": [
                "day_stats",
            ],
            "msg": "Field required",
            "type": "missing",
            "url": "https://errors.pydantic.dev/2.11/v/missing",
        },
    ]


def test_store_user_stats_invalid_secureid(client):
    response = client.post(
        "/juxtastat/store_user_stats",
        headers=identity_1,
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
        json={
            "day_stats": [[1, [True, True, True, True, True]]],
        },
    )
    assert response.status_code == 401
    assert response.json == {"code": "bad_secureid", "error": "Invalid secureID!"}
