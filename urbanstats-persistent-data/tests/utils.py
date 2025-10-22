from fastapi.testclient import TestClient


def associate_email(client: TestClient, identity: dict[str, str], email: str):
    response = client.post(
        "/juxtastat/associate_email",
        headers=identity,
        json={"token": email},
    )
    assert response.status_code == 200
    assert response.json() == {"email": email}


def create_identity(user_id: str, secure_id: str) -> dict[str, str]:
    """Create a standard identity dictionary for testing."""
    return {"x-user": user_id, "x-secure-id": secure_id}


def register_user(
    client, identity: dict[str, str], domain: str = "test.urbanstats.org"
):
    """Register a user and assert success."""
    response = client.post(
        "/juxtastat/register_user",
        headers=identity,
        json={"domain": domain},
    )
    assert response.status_code == 204
    return response


def store_juxtastat_stats(
    client, identity: dict[str, str], day: int, corrects: list[bool]
):
    """Store juxtastat user stats and assert success."""
    response = client.post(
        "/juxtastat/store_user_stats",
        headers=identity,
        json={"day_stats": [[day, corrects]]},
    )
    assert response.status_code == 204
    return response


def store_infinite_stats(
    client, identity: dict[str, str], seed: str, version: int, corrects: list[bool]
):
    """Store infinite user stats and assert success."""
    response = client.post(
        "/juxtastat_infinite/store_user_stats",
        headers=identity,
        json={"seed": seed, "version": version, "corrects": corrects},
    )
    assert response.status_code == 204
    return response


def store_retrostat_stats(
    client, identity: dict[str, str], day: int, corrects: list[bool]
):
    """Store retrostat user stats and assert success."""
    response = client.post(
        "/retrostat/store_user_stats",
        headers=identity,
        json={"day_stats": [[day, corrects]]},
    )
    assert response.status_code == 204
    return response


def send_friend_request(client, identity: dict[str, str], requestee: str):
    """Send a friend request and assert success."""
    response = client.post(
        "/juxtastat/friend_request",
        headers=identity,
        json={"requestee": requestee},
    )
    assert response.status_code == 204
    return response


def send_friend_request_with_email(
    client, identity: dict[str, str], requestee_email: str
):
    """Send a friend request using email and assert success."""
    response = client.post(
        "/juxtastat/friend_request",
        headers=identity,
        json={"requestee": requestee_email},
    )
    assert response.status_code == 204
    return response


def unfriend_user(client, identity: dict[str, str], requestee: str):
    """Unfriend a user and assert success."""
    response = client.post(
        "/juxtastat/unfriend",
        headers=identity,
        json={"requestee": requestee},
    )
    assert response.status_code == 204
    return response


def unfriend_user_with_email(client, identity: dict[str, str], requestee_email: str):
    """Unfriend a user using email and assert success."""
    response = client.post(
        "/juxtastat/unfriend",
        headers=identity,
        json={"requestee": requestee_email},
    )
    assert response.status_code == 204
    return response


def get_latest_day(client, identity: dict[str, str]):
    """Get the latest day for a user."""
    response = client.get("/juxtastat/latest_day", headers=identity)
    assert response.status_code == 200
    return response.json()


def get_latest_week(client, identity: dict[str, str]):
    """Get the latest week for a user."""
    response = client.get("/retrostat/latest_week", headers=identity)
    assert response.status_code == 200
    return response.json()


def dissociate_email(client, identity: dict[str, str]):
    """Dissociate email from user and assert success."""
    response = client.post(
        "/juxtastat/dissociate_email",
        headers=identity,
    )
    assert response.status_code == 204
    return response


def get_email(client, identity: dict[str, str]):
    """Get the email associated with a user."""
    response = client.get("/juxtastat/email", headers=identity)
    assert response.status_code == 200
    return response.json()


def check_todays_score_for(
    client, identity: dict[str, str], requesters: list[str], date: str, quiz_kind: str
):
    """Check today's score for requesters and return the response."""
    response = client.post(
        "/juxtastat/todays_score_for",
        headers=identity,
        json={"requesters": requesters, "date": date, "quiz_kind": quiz_kind},
    )
    assert response.status_code == 200
    return response.json()


def check_infinite_results(
    client, identity: dict[str, str], requesters: list[str], seed: str, version: int
):
    """Check infinite results for requesters and return the response."""
    response = client.post(
        "/juxtastat/infinite_results",
        headers=identity,
        json={"requesters": requesters, "seed": seed, "version": version},
    )
    assert response.status_code == 200
    return response.json()


def check_has_infinite_stats(client, identity: dict[str, str], seed_versions: list):
    """Check has infinite stats and return the response."""
    response = client.post(
        "/juxtastat_infinite/has_infinite_stats",
        headers=identity,
        json={"seedVersions": seed_versions},
    )
    assert response.status_code == 200
    return response.json()


def get_juxta_per_question_stats(client, day: str):
    """Get juxtastat per question stats and return the response."""
    response = client.get(
        "/juxtastat/get_per_question_stats",
        params={"day": day},
    )
    assert response.status_code == 200
    return response.json()


def get_retro_per_question_stats(client, week: str):
    """Get retrostat per question stats and return the response."""
    response = client.get(
        "/retrostat/get_per_question_stats",
        params={"week": week},
    )
    assert response.status_code == 200
    return response.json()
