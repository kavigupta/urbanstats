def test_associate_email(client):
    response = client.post(
        "/juxtastat/associate_email",
        data={
            "user": "1",
            "secureID": "11",
        },
        headers={"x-access-token": "email@gmail.com"},
    )
    assert response.status_code == 200

    # Associating the email again succeeds
    response = client.post(
        "/juxtastat/associate_email",
        data={
            "user": "1",
            "secureID": "11",
        },
        headers={"x-access-token": "email@gmail.com"},
    )
    assert response.status_code == 200

    # Associating a different email fails
    response = client.post(
        "/juxtastat/associate_email",
        data={
            "user": "1",
            "secureID": "11",
        },
        headers={"x-access-token": "email2@gmail.com"},
    )
    assert response.status_code == 409


def test_juxta_user_stats(client):
    response = client.post(
        "/juxtastat/associate_email",
        data={
            "user": "1",
            "secureID": "11",
        },
        headers={"x-access-token": "email@gmail.com"},
    )
    assert response.status_code == 200

    # Associating the email again succeeds
    response = client.post(
        "/juxtastat/associate_email",
        data={
            "user": "2",
            "secureID": "12",
        },
        headers={"x-access-token": "email@gmail.com"},
    )
    assert response.status_code == 200

    response = client.post(
        "/juxtastat/store_user_stats",
        json={
            "user": "1",
            "secureID": "11",
            "day_stats": "[[1, [true, true, true, true, true]]]",
        },
        headers={"x-access-token": "email@gmail.com"},
    )
    assert response.status_code == 200
    assert response.json == {}

    response = client.post(
        "/juxtastat/store_user_stats",
        json={
            "user": "2",
            "secureID": "12",
            "day_stats": "[[2, [true, true, true, true, true]]]",
        },
        headers={"x-access-token": "email@gmail.com"},
    )
    assert response.status_code == 200
    assert response.json == {}

    response = client.post(
        "/juxtastat/latest_day",
        data={"user": "1", "secureID": "11"},
        headers={"x-access-token": "email@gmail.com"},
    )
    print(response.json)
    assert response.status_code == 200
    assert response.json == {"latest_day": 2}

    response = client.post(
        "/juxtastat/latest_day",
        data={"user": "2", "secureID": "12"},
        headers={"x-access-token": "email@gmail.com"},
    )
    assert response.status_code == 200
    assert response.json == {"latest_day": 2}
