import json

import requests
from urbanstats_persistent_data.routes.email import (
    google_client_id,
    google_tokeninfo_timeout_seconds,
)

from .utils import (
    associate_email,
    create_identity,
    dissociate_email,
    get_email,
    get_latest_day,
    store_juxtastat_stats,
)

identity_1 = create_identity("1", "11")
identity_2 = create_identity("2", "12")


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

    store_juxtastat_stats(client, identity_1, 1, [True, True, True, True, True])
    store_juxtastat_stats(client, identity_2, 2, [True, True, True, True, True])

    result = get_latest_day(client, identity_1)
    assert result == {"latest_day": 2}

    result = get_latest_day(client, identity_2)
    assert result == {"latest_day": 2}


def test_dissociate_email(client):
    # Associate an email first
    associate_email(client, identity_1, "email@gmail.com")

    # Dissociate the email
    dissociate_email(client, identity_1)

    # After dissociation, get_email should return null
    result = get_email(client, identity_1)
    assert result == {"email": None}

    # Dissociating again should still succeed (idempotent)
    dissociate_email(client, identity_1)


def test_get_email_route(client):
    # No email associated yet
    result = get_email(client, identity_1)
    assert result == {"email": None}

    # Associate an email
    associate_email(client, identity_1, "email@gmail.com")

    # Now get_email should return the email
    result = get_email(client, identity_1)
    assert result == {"email": "email@gmail.com"}


def test_user_limit_drop(client):
    # Create multiple identities to test the user limit
    identities = []
    for i in range(32):
        identities.append(create_identity(f"{(i + 1):x}", f"{(i * 10):x}"))

    # Associate the same email with all identities
    email = "test@example.com"
    for identity in identities:
        associate_email(client, identity, email)

    # Only 16 identifies must still have an email associated
    total_associated = 0
    for identity in identities:
        result = get_email(client, identity)
        if result["email"] is not None:
            total_associated += 1

    assert total_associated == 16


def test_rejects_token_from_another_client(client, mocker):
    class MockResponse:
        status_code = 200
        content = json.dumps(
            {
                "email": "victim@gmail.com",
                "email_verified": True,
                "aud": "attackers-own-client.apps.googleusercontent.com",
            }
        )

    mocker.patch("requests.get", lambda url, timeout: MockResponse())

    response = client.post(
        "/juxtastat/associate_email",
        headers=identity_1,
        json={"token": "victim-token"},
    )
    assert response.status_code == 401


def test_rejects_unverified_email(client, mocker):
    class MockResponse:
        status_code = 200
        content = json.dumps(
            {
                "email": "victim@gmail.com",
                "email_verified": False,
                "aud": google_client_id,
            }
        )

    mocker.patch("requests.get", lambda url, timeout: MockResponse())

    response = client.post(
        "/juxtastat/associate_email",
        headers=identity_1,
        json={"token": "unverified-token"},
    )
    assert response.status_code == 401


def test_associate_email_survives_google_hanging(client, mocker):
    timeouts = []

    def hang(url, timeout):
        del url
        timeouts.append(timeout)
        raise requests.Timeout()

    mocker.patch("requests.get", hang)

    response = client.post(
        "/juxtastat/associate_email",
        headers=identity_1,
        json={"token": "email@gmail.com"},
    )

    # Without a timeout this request pins a worker thread for as long as Google holds it open
    assert timeouts == [google_tokeninfo_timeout_seconds]
    assert response.status_code == 500
