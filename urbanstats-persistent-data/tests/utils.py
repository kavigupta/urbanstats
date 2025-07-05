import fastapi


def associate_email(
    client: fastapi.testclient.TestClient, identity: dict[str, str], email: str
):
    response = client.post(
        "/juxtastat/associate_email",
        headers=identity,
        json={"token": email},
    )
    assert response.status_code == 200
    assert response.json() == {"email": email}
