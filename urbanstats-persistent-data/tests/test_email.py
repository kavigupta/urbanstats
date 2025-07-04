from .utils import associate_email

identity_1 = {
    "x-user": "1",
    "x-secure-id": "11",
}

identity_2 = {
    "x-user": "2",
    "x-secure-id": "12",
}


def test_associate_email(client):
    associate_email(client, identity_1, "email@gmail.com")

    # Associating the email again succeeds
    associate_email(client, identity_1, "email@gmail.com")

    # Associating a different email succeeds
    associate_email(client, identity_1, "email2@gmail.com")


def test_juxta_user_stats(client):
    associate_email(client, identity_1, "email@gmail.com")

    # Associating the email again succeeds
    associate_email(client, identity_2, "email@gmail.com")

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
    associate_email(client, identity_1, "email@gmail.com")

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
    associate_email(client, identity_1, "email@gmail.com")

    # Now get_email should return the email
    response = client.get(
        "/juxtastat/email",
        headers=identity_1,
    )
    assert response.status_code == 200
    assert response.json() == {"email": "email@gmail.com"}


def test_user_limit_drop(client):
    # Create multiple identities to test the user limit
    identities = []
    for i in range(32):
        identities.append(
            {
                "x-user": f"{(i + 1):x}",
                "x-secure-id": f"{(i * 10):x}",
            }
        )

    # Associate the same email with all identities
    email = "test@example.com"
    for identity in identities:
        associate_email(client, identity, email)

    # Only 16 identifies must still have an email associated
    total_associated = 0
    for identity in identities:
        response = client.get(
            "/juxtastat/email",
            headers=identity,
        )
        assert response.status_code == 200
        if response.json()["email"] is not None:
            total_associated += 1

    assert total_associated == 16
