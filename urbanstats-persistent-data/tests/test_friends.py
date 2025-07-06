from .utils import (
    associate_email,
    check_infinite_results,
    check_todays_score_for,
    create_identity,
    dissociate_email,
    send_friend_request,
    send_friend_request_with_email,
    store_infinite_stats,
    store_juxtastat_stats,
    unfriend_user,
    unfriend_user_with_email,
)

identity_a = create_identity("a", "aa")
identity_b = create_identity("b", "bb")
identity_c = create_identity("c", "cc")


def test_friends(client):
    send_friend_request(client, identity_a, "b")
    send_friend_request(client, identity_b, "a")

    result = check_todays_score_for(client, identity_a, ["b"], "1", "juxtastat")
    assert result == {"results": [{"corrects": None, "friends": True}]}

    # Store a score for juxtastat
    store_juxtastat_stats(client, identity_a, 1, [True, False, False, True, True])

    # Now b should be able to see a's score
    result = check_todays_score_for(client, identity_b, ["a"], "1", "juxtastat")
    assert result == {
        "results": [{"corrects": [True, False, False, True, True], "friends": True}]
    }


def test_unfriend(client):
    # Send friend request from a to b
    send_friend_request(client, identity_a, "b")

    # Send friend request from b to a
    send_friend_request(client, identity_b, "a")

    # Unfriend: a unfriends b
    unfriend_user(client, identity_a, "b")

    # Now, b should not be able to see a's score
    result = check_todays_score_for(client, identity_b, ["a"], "1", "juxtastat")
    assert result == {
        "results": [
            {
                "friends": False,
            }
        ]
    }

    # But a can still see b since b has friended them
    result = check_todays_score_for(client, identity_a, ["b"], "1", "juxtastat")
    assert result == {"results": [{"corrects": None, "friends": True}]}


def test_friends_infinite(client):
    result = check_infinite_results(client, identity_b, ["a"], "abc", 1)
    assert result == {
        "results": [
            {
                "friends": False,
            }
        ]
    }

    send_friend_request(client, identity_a, "b")

    result = check_infinite_results(client, identity_b, ["a"], "abc", 1)
    assert result == {
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
    store_infinite_stats(client, identity_a, "abc", 1, [True, False, False, False])

    # Now b should be able to see a's score
    result = check_infinite_results(client, identity_b, ["a"], "abc", 1)
    assert result == {
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


def test_friends_transitive(client):
    # associate a + b
    associate_email(client, identity_a, "email@gmail.com")
    associate_email(client, identity_b, "email@gmail.com")

    # friend from c to a
    send_friend_request(client, identity_c, "a")

    # post score for b
    store_juxtastat_stats(client, identity_b, 1, [True, False, False, True, True])

    # friend from b to c
    send_friend_request(client, identity_b, "c")

    # get scores for a from c
    result = check_todays_score_for(client, identity_c, ["a"], "1", "juxtastat")
    assert result == {
        "results": [{"corrects": [True, False, False, True, True], "friends": True}]
    }


def test_friends_transitive_infinite(client):
    # associate a + b
    associate_email(client, identity_a, "email@gmail.com")
    associate_email(client, identity_b, "email@gmail.com")

    # friend from c to a
    send_friend_request(client, identity_c, "a")

    # post score for b
    store_infinite_stats(client, identity_b, "abc", 1, [True, False, False, False])

    # friend from b to c
    send_friend_request(client, identity_b, "c")

    # get scores for a from c
    result = check_infinite_results(client, identity_c, ["a"], "abc", 1)
    assert result == {
        "results": [
            {
                "forThisSeed": 1,
                "friends": True,
                "maxScore": 1,
                "maxScoreSeed": "abc",
                "maxScoreVersion": 1,
            }
        ]
    }

    # post score for a
    store_infinite_stats(client, identity_a, "abc", 1, [True, True, False, False])

    # get scores for a from c
    result = check_infinite_results(client, identity_c, ["a"], "abc", 1)
    assert result == {
        "results": [
            {
                "forThisSeed": 2,
                "friends": True,
                "maxScore": 2,
                "maxScoreSeed": "abc",
                "maxScoreVersion": 1,
            }
        ]
    }


def test_friends_with_emails(client):
    # Associate users with emails
    associate_email(client, identity_a, "alice@example.com")
    associate_email(client, identity_b, "bob@example.com")
    associate_email(client, identity_c, "charlie@example.com")

    # Send friend request from a to b using email
    send_friend_request_with_email(client, identity_a, "bob@example.com")

    # Ba can see a's score
    result = check_todays_score_for(client, identity_b, ["a"], "1", "juxtastat")
    assert result == {"results": [{"corrects": None, "friends": True}]}

    # Send friend request from b to a using email
    send_friend_request_with_email(client, identity_b, "alice@example.com")

    # A can se b's score
    result = check_todays_score_for(client, identity_a, ["b"], "1", "juxtastat")
    assert result == {"results": [{"corrects": None, "friends": True}]}


def test_unfriend_with_emails(client):
    # Associate users with emails
    associate_email(client, identity_a, "alice@example.com")
    associate_email(client, identity_b, "bob@example.com")

    # Send friend request from a to b using email
    send_friend_request_with_email(client, identity_a, "bob@example.com")

    # Send friend request from b to a using email
    send_friend_request_with_email(client, identity_b, "alice@example.com")

    # Unfriend: a unfriends b using email
    unfriend_user_with_email(client, identity_a, "bob@example.com")

    # Now, b should not be able to see a's score
    result = check_todays_score_for(client, identity_b, ["a"], "1", "juxtastat")
    assert result == {
        "results": [
            {
                "friends": False,
            }
        ]
    }

    # But a can still see b since b has friended them
    result = check_todays_score_for(client, identity_a, ["b"], "1", "juxtastat")
    assert result == {"results": [{"corrects": None, "friends": True}]}


def test_friends_infinite_with_emails(client):
    # Associate users with emails
    associate_email(client, identity_a, "alice@example.com")
    associate_email(client, identity_b, "bob@example.com")

    # Initially, b cannot see a's infinite results
    result = check_infinite_results(client, identity_b, ["a"], "abc", 1)
    assert result == {
        "results": [
            {
                "friends": False,
            }
        ]
    }

    # Send friend request from a to b using email
    send_friend_request_with_email(client, identity_a, "bob@example.com")

    # Now b can see a's infinite results (but no score yet)
    result = check_infinite_results(client, identity_b, ["a"], "abc", 1)
    assert result == {
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
    store_infinite_stats(client, identity_a, "abc", 1, [True, False, False, False])

    # Now b should be able to see a's score
    result = check_infinite_results(client, identity_b, ["a"], "abc", 1)
    assert result == {
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


def test_friends_disassociate_from_email(client):
    # Associate users with emails
    associate_email(client, identity_a, "alice@example.com")
    associate_email(client, identity_b, "bob@example.com")

    # Send friend request from a to b using email
    send_friend_request_with_email(client, identity_a, "bob@example.com")

    # Send friend request from b to a using email
    send_friend_request_with_email(client, identity_b, "alice@example.com")

    # Verify they can see each other's scores
    result = check_todays_score_for(client, identity_a, ["b"], "1", "juxtastat")
    assert result == {"results": [{"corrects": None, "friends": True}]}

    result = check_todays_score_for(client, identity_b, ["a"], "1", "juxtastat")
    assert result == {"results": [{"corrects": None, "friends": True}]}

    # Disassociate a from their email
    dissociate_email(client, identity_a)

    # Now b should not be able to see a's score since the friendship was based on email
    result = check_todays_score_for(client, identity_b, ["a"], "1", "juxtastat")
    assert result == {
        "results": [
            {
                "friends": False,
            }
        ]
    }

    # But a can still see b since b is still associated with their email
    result = check_todays_score_for(client, identity_a, ["b"], "1", "juxtastat")
    assert result == {"results": [{"friends": False}]}
