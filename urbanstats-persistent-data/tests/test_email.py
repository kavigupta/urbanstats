identity_1 = {
    "x-user": "1",
    "x-secure-id": "11",
}

identity_2 = {
    "x-user": "2",
    "x-secure-id": "12",
}


def test_associate_email(client):
    response = client.post(
        "/juxtastat/associate_email",
        headers=identity_1,
        json={"token": "email@gmail.com"},
    )
    assert response.status_code == 204

    # Associating the email again succeeds
    response = client.post(
        "/juxtastat/associate_email",
        headers=identity_1,
        json={"token": "email@gmail.com"},
    )
    assert response.status_code == 204

    # Associating a different email fails
    response = client.post(
        "/juxtastat/associate_email",
        headers=identity_1,
        json={"token": "email2@gmail.com"},
    )
    assert response.status_code == 409


def test_juxta_user_stats(client):
    response = client.post(
        "/juxtastat/associate_email",
        headers=identity_1,
        json={"token": "email@gmail.com"},
    )
    assert response.status_code == 204

    # Associating the email again succeeds
    response = client.post(
        "/juxtastat/associate_email",
        headers=identity_2,
        json={"token": "email@gmail.com"},
    )
    assert response.status_code == 204

    response = client.post(
        "/juxtastat/store_user_stats",
        json={
            "day_stats": [[1, [True, True, True, True, True]]],
        },
        headers=identity_1,
    )
    assert response.status_code == 204

    response = client.post(
        "/juxtastat/store_user_stats",
        json={
            "day_stats": [[2, [True, True, True, True, True]]],
        },
        headers=identity_2,
    )
    assert response.status_code == 204

    response = client.get(
        "/juxtastat/latest_day",
        headers=identity_1,
    )
    print(response.json)
    assert response.status_code == 200
    assert response.json() == {"latest_day": 2}

    response = client.get(
        "/juxtastat/latest_day",
        headers=identity_2,
    )
    assert response.status_code == 200
    assert response.json() == {"latest_day": 2}
