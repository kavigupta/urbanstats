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
    assert response.status_code == 204

    response = client.post(
        "/juxtastat/friend_request", headers=identity_b, json={"requestee": "a"}
    )
    assert response.status_code == 204

    response = client.post(
        "/juxtastat/todays_score_for",
        headers=identity_a,
        json={"requesters": ["b"], "date": "1", "quiz_kind": "juxtastat"},
    )
    assert response.status_code == 200
    assert response.json() == {"results": [{"corrects": None, "friends": True}]}

    # Store a score for juxtastat
    response = client.post(
        "/juxtastat/store_user_stats",
        headers=identity_a,
        json={"day_stats": [[1, [True, False, False, True, True]]]},
    )
    assert response.status_code == 204

    # Now b should be able to see a's score
    response = client.post(
        "/juxtastat/todays_score_for",
        headers=identity_b,
        json={"requesters": ["a"], "date": "1", "quiz_kind": "juxtastat"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "results": [{"corrects": [True, False, False, True, True], "friends": True}]
    }


def test_unfriend(client):
    # Send friend request from a to b
    response = client.post(
        "/juxtastat/friend_request", headers=identity_a, json={"requestee": "b"}
    )
    assert response.status_code == 204

    # Send friend request from b to a
    response = client.post(
        "/juxtastat/friend_request", headers=identity_b, json={"requestee": "a"}
    )
    assert response.status_code == 204

    # Unfriend: a unfriends b
    response = client.post(
        "/juxtastat/unfriend", headers=identity_a, json={"requestee": "b"}
    )
    assert response.status_code == 204

    # Now, b should not be able to see a's score
    response = client.post(
        "/juxtastat/todays_score_for",
        headers=identity_b,
        json={"requesters": ["a"], "date": "1", "quiz_kind": "juxtastat"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "results": [
            {
                "friends": False,
            }
        ]
    }

    # But a can still see b since b has friended them
    response = client.post(
        "/juxtastat/todays_score_for",
        headers=identity_a,
        json={"requesters": ["b"], "date": "1", "quiz_kind": "juxtastat"},
    )
    assert response.status_code == 200
    assert response.json() == {"results": [{"corrects": None, "friends": True}]}


def test_friends_infinite(client):
    response = client.post(
        "/juxtastat/infinite_results",
        headers=identity_b,
        json={"requesters": ["a"], "seed": "abc", "version": 1},
    )
    assert response.status_code == 200
    assert response.json() == {
        "results": [
            {
                "friends": False,
            }
        ]
    }

    response = client.post(
        "/juxtastat/friend_request", headers=identity_a, json={"requestee": "b"}
    )
    assert response.status_code == 204

    response = client.post(
        "/juxtastat/infinite_results",
        headers=identity_b,
        json={"requesters": ["a"], "seed": "abc", "version": 1},
    )
    assert response.status_code == 200
    assert response.json() == {
        "results": [
            {
                "forThisSeed": None,
                "friends": True,
                "maxScore": None,
                "maxScoreSeed": None,
                "maxScoreVersion": None,
            }
        ]
    }

    # Store a score for infinite
    response = client.post(
        "/juxtastat_infinite/store_user_stats",
        headers=identity_a,
        json={"seed": "abc", "version": 1, "corrects": [True, False, False, False]},
    )
    assert response.status_code == 204

    # Now b should be able to see a's score
    response = client.post(
        "/juxtastat/infinite_results",
        headers=identity_b,
        json={"requesters": ["a"], "seed": "abc", "version": 1},
    )
    assert response.status_code == 200
    assert response.json() == {
        "results": [
            {
                "forThisSeed": 1,
                "maxScore": 1,
                "maxScoreSeed": "abc",
                "maxScoreVersion": 1,
                "friends": True,
            }
        ]
    }
