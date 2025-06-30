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
    assert response.status_code == 200
    assert response.json() == {"email": "email@gmail.com"}

    # Associating the email again succeeds
    response = client.post(
        "/juxtastat/associate_email",
        headers=identity_1,
        json={"token": "email@gmail.com"},
    )
    assert response.status_code == 200
    assert response.json() == {"email": "email@gmail.com"}

    # Associating a different email succeeds
    response = client.post(
        "/juxtastat/associate_email",
        headers=identity_1,
        json={"token": "email2@gmail.com"},
    )
    assert response.status_code == 200
    assert response.json() == {"email": "email2@gmail.com"}


def test_juxta_user_stats(client):
    response = client.post(
        "/juxtastat/associate_email",
        headers=identity_1,
        json={"token": "email@gmail.com"},
    )
    assert response.status_code == 200
    assert response.json() == {"email": "email@gmail.com"}

    # Associating the email again succeeds
    response = client.post(
        "/juxtastat/associate_email",
        headers=identity_2,
        json={"token": "email@gmail.com"},
    )
    assert response.status_code == 200
    assert response.json() == {"email": "email@gmail.com"}

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


def test_dissociate_email(client):
    # Associate an email first
    response = client.post(
        "/juxtastat/associate_email",
        headers=identity_1,
        json={"token": "email@gmail.com"},
    )
    assert response.status_code == 200
    assert response.json() == {"email": "email@gmail.com"}

    # Dissociate the email
    response = client.post(
        "/juxtastat/dissociate_email",
        headers=identity_1,
    )
    assert response.status_code == 204

    # After dissociation, get_email should return null
    response = client.get(
        "/juxtastat/email",
        headers=identity_1,
    )
    assert response.status_code == 200
    assert response.json() == {"email": None}

    # Dissociating again should still succeed (idempotent)
    response = client.post(
        "/juxtastat/dissociate_email",
        headers=identity_1,
    )
    assert response.status_code == 204


def test_get_email_route(client):
    # No email associated yet
    response = client.get(
        "/juxtastat/email",
        headers=identity_1,
    )
    assert response.status_code == 200
    assert response.json() == {"email": None}

    # Associate an email
    response = client.post(
        "/juxtastat/associate_email",
        headers=identity_1,
        json={"token": "email@gmail.com"},
    )
    assert response.status_code == 200

    # Now get_email should return the email
    response = client.get(
        "/juxtastat/email",
        headers=identity_1,
    )
    assert response.status_code == 200
    assert response.json() == {"email": "email@gmail.com"}
