import React, { ReactNode, useEffect, useState } from 'react'

import { ENDPOINT, QuizFriends } from './quiz'
import { unique_persistent_id, unique_secure_id } from './statistics'

export function QuizFriendsPanel(props: { quizFriends: QuizFriends, setQuizFriends: (quizFriends: QuizFriends) => void, date: number }): ReactNode {
    const [outgoingRequests, setOutgoingRequests] = useState([] as string[])
    const [pendingRequests, setPendingRequests] = useState([] as string[])
    const [friendScores, setFriendScores] = useState({} as Record<string, boolean[]>)

    useEffect(() => {
        void (async () => {
            const requesters = props.quizFriends.map(x => x[1])
            console.log('requesters', requesters)
            const user = unique_persistent_id()
            const secureID = unique_secure_id()
            const friendsStatusPromise = fetch(`${ENDPOINT}/juxtastat/friends_status`, {
                method: 'POST',
                body: JSON.stringify({ user, secureID }),
                headers: {
                    'Content-Type': 'application/json',
                },
            }).then(x => x.json())
            const friendScoresPromise = fetch(`${ENDPOINT}/juxtastat/todays_score_for`, {
                method: 'POST',
                body: JSON.stringify({ user, secureID, date: props.date, requesters }),
                headers: {
                    'Content-Type': 'application/json',
                },
            }).then(x => x.json())
            const friendsStatus = (await friendsStatusPromise) as { results: { outgoing_requests: string[], incoming_requests: string[] } }
            console.log('HI')
            console.log(friendsStatus)
            console.log(friendsStatus.results.outgoing_requests)
            console.log(friendsStatus.results.incoming_requests)
            const friendScoresResponse = (await friendScoresPromise) as { results: { corrects: boolean[], friends: boolean }[] }
            const scoresDict = {} as Record<string, boolean[]>
            console.log('friend scores response', friendScoresResponse)
            friendScoresResponse.results.forEach(({ corrects, friends }, idx) => {
                console.log('scores', corrects)
                if (friends) {
                    scoresDict[requesters[idx]] = corrects
                }
            })
            setOutgoingRequests(friendsStatus.results.outgoing_requests)
            setPendingRequests(friendsStatus.results.incoming_requests)
            console.log('scores dict', scoresDict)
            setFriendScores(scoresDict)
        })()
    }, [props.date, props.quizFriends])

    const displayFriend = (id: string): ReactNode => {
        console.log('friend scores', friendScores)
        if (!pendingRequests.includes(id)) {
            return <div key={id}>Request not approved</div>
        }
        const score = friendScores[id]
        return <div key={id}>{JSON.stringify(score)}</div>
    }

    return (
        <div>
            <h2>Friends</h2>
            {
                props.quizFriends.map(([name, id]) => {
                    return (
                        <div key={id}>
                            <span>{name}</span>
                            {displayFriend(id)}
                        </div>
                    )
                })
            }
            <h2>Pending requests</h2>
            {
                pendingRequests.filter(
                    id => !outgoingRequests.includes(id),
                ).map(id => <div key={id}>{id}</div>)
            }
            <AddFriend quizFriends={props.quizFriends} setQuizFriends={props.setQuizFriends} />
        </div>
    )
}

function AddFriend(props: {
    quizFriends: QuizFriends
    setQuizFriends: (x: QuizFriends) => void
}): ReactNode {
    const [friendName, setFriendName] = useState('')
    const [friendID, setFriendID] = useState('')

    const addFriend = async (): Promise<void> => {
        const user = unique_persistent_id()
        const secureID = unique_secure_id()
        await fetch(`${ENDPOINT}/juxtastat/friend_request`, {
            method: 'POST',
            body: JSON.stringify({ user, secureID, requestee: friendID }),
            headers: {
                'Content-Type': 'application/json',
            },
        })
        props.setQuizFriends([...props.quizFriends, [friendName, friendID]])
    }

    return (
        <div>
            <input
                type="text"
                placeholder="Friend name"
                value={friendName}
                onChange={(e) => { setFriendName(e.target.value) }}
            />
            <input
                type="text"
                placeholder="Friend ID"
                value={friendID}
                onChange={(e) => { setFriendID(e.target.value) }}
            />
            <button onClick={addFriend}>Add friend</button>
        </div>
    )
}
