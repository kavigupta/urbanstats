import base64

import pytest

from .utils import (
    check_has_infinite_stats,
    create_identity,
    get_juxta_per_question_stats,
    get_latest_day,
    get_latest_week,
    get_retro_per_question_stats,
    register_user,
    store_juxtastat_stats,
    store_retrostat_stats,
)

identity_1 = create_identity("1", "11")


def test_register_user(client):
    register_user(client, identity_1)


def test_register_user_invalid_hex(client):
    # x-user is not a valid hex string
    expected_error = {
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
    response = client.post(
        "/juxtastat/register_user",
        headers=create_identity("nothex", "11"),
        json={"domain": "test.urbanstats.org"},
    )
    assert response.status_code == 422
    assert response.json() == expected_error


def test_register_no_body(client):
    expected_error = {
        "detail": [
            {"type": "missing", "loc": ["body"], "msg": "Field required", "input": None}
        ]
    }
    response = client.post(
        "/juxtastat/register_user",
        headers=identity_1,
    )
    assert response.status_code == 422
    assert response.json() == expected_error


def test_get_latest_day(client):
    result = get_latest_day(client, identity_1)
    assert result == {"latest_day": -100}


def test_get_latest_week(client):
    result = get_latest_week(client, identity_1)
    assert result == {"latest_day": -100}


def test_store_user_stats_success(client):
    store_juxtastat_stats(client, identity_1, 1, [True, True, True, True, True])

    result = get_latest_day(client, identity_1)
    assert result == {"latest_day": 1}


def test_store_user_stats_missing_fields(client):
    expected_error = {
        "detail": [
            {
                "type": "missing",
                "loc": ["body", "day_stats"],
                "msg": "Field required",
                "input": {},
            }
        ]
    }
    response = client.post(
        "/juxtastat/store_user_stats",
        headers=identity_1,
        json={},
    )
    assert response.status_code == 422
    assert response.json() == expected_error


def test_store_user_stats_invalid_secureid(client):
    store_juxtastat_stats(client, identity_1, 1, [True, True, True, True, True])

    expected_error = {"detail": "Invalid secure ID"}
    response = client.post(
        "/juxtastat/store_user_stats",
        headers=create_identity("1", "12"),
        json={"day_stats": [[1, [True, True, True, True, True], False]]},
    )
    assert response.status_code == 401
    assert response.json() == expected_error


def test_has_infinite_stats(client):
    result = check_has_infinite_stats(client, identity_1, [["a", 1], ["b", 2]])
    assert result == {"has": [False, False]}


def test_store_retro(client):
    store_retrostat_stats(client, identity_1, 1, [True, True, True, True, True])


def test_juxta_per_question(client):
    register_user(client, identity_1, "urbanstats.org")

    result = get_juxta_per_question_stats(client, "1")
    assert result == {
        "per_question": [],
        "total": 0,
    }

    store_juxtastat_stats(client, identity_1, 1, [True, True, True, True, True])

    result = get_juxta_per_question_stats(client, "1")
    assert result == {
        "per_question": [1, 1, 1, 1, 1],
        "total": 1,
    }


def test_retro_per_question(client):
    result = get_retro_per_question_stats(client, "1")
    assert result == {
        "per_question": [],
        "total": 0,
    }


def test_404_not_found(client):
    response = client.get("/nonexistent/endpoint", headers=identity_1)
    assert response.status_code == 404


@pytest.mark.parametrize(
    "kind, store, mask_path",
    [
        ("juxtastat", store_juxtastat_stats, "/juxtastat/played_days"),
        ("retrostat", store_retrostat_stats, "/retrostat/played_weeks"),
    ],
)
def test_played_mask_includes_out_of_order_problems(client, kind, store, mask_path):
    identity = create_identity("9", "99")
    register_user(client, identity)
    for problem in [100, 3]:
        store(client, identity, problem, [True] * 5)
    response = client.post(
        f"/{kind}/store_user_stats",
        headers=identity,
        json={"day_stats": [[9, [True] * 5, True]]},
    )
    assert response.status_code == 204

    response = client.get(mask_path, headers=identity)
    assert response.status_code == 200
    mask = base64.b64decode(response.json()["mask"])
    played = {day for day in range(len(mask) * 8) if mask[day // 8] >> (day % 8) & 1}
    assert played == {3, 9, 100}
