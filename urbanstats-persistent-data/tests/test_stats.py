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


def test_register_user_invalid_hex(client):
    # x-user is not a valid hex string
    response = client.post(
        "/juxtastat/register_user",
        headers={"x-user": "nothex", "x-secure-id": "11"},
        json={"domain": "test.urbanstats.org"},
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": [
            {
                "type": "value_error",
                "loc": ["header", "x-user"],
                "msg": "Value error, invalid literal for int() with base 16: 'nothex'",
                "input": "nothex",
                "ctx": {"error": {}},
            }
        ]
    }


def test_register_no_body(client):
    response = client.post(
        "/juxtastat/register_user",
        headers=identity_1,
    )
    assert response.status_code == 422
    assert response.json() == {
        "detail": [
            {"type": "missing", "loc": ["body"], "msg": "Field required", "input": None}
        ]
    }


def test_get_latest_day(client):
    response = client.get("/juxtastat/latest_day", headers=identity_1)
    assert response.status_code == 200
    assert response.json() == {"latest_day": -100}


def test_get_latest_week(client):
    response = client.get("/retrostat/latest_week", headers=identity_1)
    assert response.status_code == 200
    assert response.json() == {"latest_day": -100}


def test_store_user_stats_success(client):
    response = client.post(
        "/juxtastat/store_user_stats",
        headers=identity_1,
        json={
            "day_stats": [[1, [True, True, True, True, True]]],
        },
    )
    assert response.json() is None
    assert response.status_code == 200

    response = client.get("/juxtastat/latest_day", headers=identity_1)
    assert response.status_code == 200
    assert response.json() == {"latest_day": 1}


def test_store_user_stats_missing_fields(client):
    response = client.post(
        "/juxtastat/store_user_stats",
        headers=identity_1,
        json={},
    )
    assert response.status_code == 422
    assert response.json() == {
        "detail": [
            {
                "type": "missing",
                "loc": ["body", "day_stats"],
                "msg": "Field required",
                "input": {},
            }
        ]
    }


def test_store_user_stats_invalid_secureid(client):
    response = client.post(
        "/juxtastat/store_user_stats",
        headers=identity_1,
        json={
            "day_stats": [[1, [True, True, True, True, True]]],
        },
    )
    assert response.status_code == 200
    assert response.json() is None

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
    assert response.json() == {"detail": "Invalid secure ID"}


def test_has_infinite_stats(client):
    response = client.post(
        "/juxtastat_infinite/has_infinite_stats",
        headers=identity_1,
        json={
            "seedVersions": [["a", 1], ["b", 2]],
        },
    )
    assert response.status_code == 200
    assert response.json() == {"has": [False, False]}


def test_store_retro(client):
    response = client.post(
        "/retrostat/store_user_stats",
        headers=identity_1,
        json={
            "day_stats": [[1, [True, True, True, True, True]]],
        },
    )
    assert response.status_code == 200
    assert response.json() is None


def test_juxta_per_question(client):
    response = client.post(
        "/juxtastat/register_user",
        headers=identity_1,
        json={
            "domain": "urbanstats.org",
        },
    )
    assert response.status_code == 200

    response = client.get(
        "/juxtastat/get_per_question_stats",
        params={"day": "1"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "per_question": [],
        "total": 0,
    }

    response = client.post(
        "/juxtastat/store_user_stats",
        headers=identity_1,
        json={
            "day_stats": [[1, [True, True, True, True, True]]],
        },
    )
    assert response.json() is None
    assert response.status_code == 200

    response = client.get(
        "/juxtastat/get_per_question_stats",
        params={"day": "1"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "per_question": [1, 1, 1, 1, 1],
        "total": 1,
    }


def test_retro_per_question(client):
    response = client.get(
        "/retrostat/get_per_question_stats",
        params={"week": "1"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "per_question": [],
        "total": 0,
    }


def test_404_not_found(client):
    response = client.get("/nonexistent/endpoint", headers=identity_1)
    assert response.status_code == 404
