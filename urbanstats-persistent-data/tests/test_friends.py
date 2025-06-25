identity_a = {
    "x-user": "a",
    "x-secure-id": "aa",
}

identity_b = {
    "x-user": "b",
    "x-secure-id": "bb",
}


def test_friends(client):
    response = client.post(
        "/juxtastat/friend_request", headers=identity_a, json={"requestee": "b"}
    )
    assert response.status_code == 200

    response = client.post(
        "/juxtastat/friend_request", headers=identity_b, json={"requestee": "a"}
    )
    assert response.status_code == 200

    response = client.post(
        "/juxtastat/todays_score_for",
        headers=identity_a,
        json={"requesters": ["b"], "date": "1", "quiz_kind": "juxtastat"},
    )
    assert response.status_code == 200
    assert response.json == {"results": [{"corrects": None, "friends": True}]}
