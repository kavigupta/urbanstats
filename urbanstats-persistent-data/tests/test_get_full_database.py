def test_get_full_database_invalid_token(client):
    response = client.post("/juxtastat/get_full_database", json={"token": "invalid"})
    assert response.status_code == 401


def test_get_full_database_valid_token(client):
    response = client.post("/juxtastat/get_full_database", json={"token": "valid"})
    assert response.status_code == 200
