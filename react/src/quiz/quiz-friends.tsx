import React, { ReactNode, useEffect, useState } from 'react'

import { EditableString } from '../components/table'
import { useColors, useJuxtastatColors } from '../page_template/colors'
import { mixWithBackground } from '../utils/color'

import { ENDPOINT, QuizFriends } from './quiz'
import { unique_persistent_id, unique_secure_id } from './statistics'

interface FriendScore { name?: string, corrects: boolean[] | null, friends: boolean }

export function QuizFriendsPanel(props: {
    quizFriends: QuizFriends
    setQuizFriends: (quizFriends: QuizFriends) => void
    quizKind: 'juxtastat' | 'retrostat'
    date: number
    myCorrects: boolean[]
}): ReactNode {
    // const [outgoingRequests, setOutgoingRequests] = useState([] as string[])
    // const [pendingRequests, setPendingRequests] = useState([] as string[])
    const [friendScores, setFriendScores] = useState([] as FriendScore[])

    useEffect(() => {
        void (async () => {
            // map name to id for quizFriends
            const quizIDtoName = Object.fromEntries(props.quizFriends.map(x => [x[1], x[0]]))
            const requesters = props.quizFriends.map(x => x[1])
            console.log('requesters', requesters)
            const user = unique_persistent_id()
            const secureID = unique_secure_id()
            // const friendsStatusPromise = fetch(`${ENDPOINT}/juxtastat/friends_status`, {
            //     method: 'POST',
            //     body: JSON.stringify({ user, secureID }),
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            // }).then(x => x.json())
            const friendScoresPromise = fetch(`${ENDPOINT}/juxtastat/todays_score_for`, {
                method: 'POST',
                body: JSON.stringify({ user, secureID, date: props.date, requesters, quiz_kind: props.quizKind }),
                headers: {
                    'Content-Type': 'application/json',
                },
            }).then(x => x.json())
            // const friendsStatus = (await friendsStatusPromise) as { results: { outgoing_requests: string[], incoming_requests: string[] } }
            const friendScoresResponse = (await friendScoresPromise) as { results: { corrects: boolean[] | null, friends: boolean }[] } | { error: string }
            if ('error' in friendScoresResponse) {
                // probably some kind of auth error. Handled elsewhere
                return
            }
            // setOutgoingRequests(friendsStatus.results.outgoing_requests)
            // setPendingRequests(friendsStatus.results.incoming_requests)
            setFriendScores(friendScoresResponse.results.map(
                (x, idx) => ({ name: quizIDtoName[requesters[idx]], corrects: x.corrects, friends: x.friends })
            ))
        })()
    }, [props.date, props.quizFriends, props.quizKind])

    return (
        <div>
            <div style={{ margin: 'auto', width: '100%' }}>
                <div className="quiz_summary">Friends</div>
            </div>
            <>
                <FriendScore
                    friendScore={{ name: 'You', corrects: props.myCorrects, friends: true }}
                />

                {
                    friendScores.map((friendScore, idx) => (
                        <FriendScore
                            key={idx}
                            friendScore={friendScore}
                            removeFriend={() => {
                                console.log('current quiz friends', props.quizFriends)
                                const newQuizFriends = props.quizFriends.filter(x => x[0] !== friendScore.name)
                                console.log('new quiz friends', newQuizFriends)
                                props.setQuizFriends(newQuizFriends)
                            }}
                            renameFriend={(name: string) => {
                                const newQuizFriends = props.quizFriends.map(x => (x[0] === friendScore.name ? [name, x[1]] : x) satisfies [string, string])
                                props.setQuizFriends(newQuizFriends)
                            }}
                        />
                    ),
                    )
                }
            </>
            <div style={{ height: '1em' }} />
            <AddFriend quizFriends={props.quizFriends} setQuizFriends={props.setQuizFriends} />
            {/* <h2>Pending requests</h2>
            {
                pendingRequests.filter(
                    id => !outgoingRequests.includes(id),
                ).map(id => <div key={id}>{id}</div>)
            } */}
        </div>
    )
}

const SCORE_CORRECT_HEIGHT = '2em'
const ADD_FRIEND_HEIGHT = '1.5em'

function FriendScore(props: { friendScore: FriendScore, removeFriend?: () => void, renameFriend?: (name: string) => void }): ReactNode {
    console.log('friend score', props.friendScore)
    return (
        <div style={{ display: 'flex', flexDirection: 'row', height: SCORE_CORRECT_HEIGHT, alignItems: 'center' }}>
            <div style={{ width: '25%' }}>
                <FriendScoreName name={props.friendScore.name} renameFriend={props.renameFriend} />
            </div>
            <div style={{ width: '50%' }}>
                <FriendScoreCorrects {...props.friendScore} />
            </div>
            <div style={{ width: '25%', display: 'flex', height: ADD_FRIEND_HEIGHT }}>
                {props.removeFriend !== undefined
                    && (
                        <button
                            onClick={props.removeFriend}
                            style={{ marginLeft: '1em' }}
                        >
                            Remove
                        </button>
                    )}
            </div>
        </div>
    )
}

function FriendScoreName(props: { name?: string, renameFriend?: (name: string) => void }): ReactNode {
    const name = props.name ?? 'Unknown'
    if (props.renameFriend === undefined) {
        return <div>{name}</div>
    }
    return (
        <EditableString
            content={name}
            onNewContent={props.renameFriend}
            style={{ width: '100%', height: '100%' }}
            inputMode="text"
        />
    )
}

function FriendScoreCorrects(props: FriendScore): ReactNode {
    const colors = useColors()
    const juxtaColors = useJuxtastatColors()
    const border = `1px solid ${colors.background}`
    const greyedOut = {
        backgroundColor: mixWithBackground(colors.hueColors.orange, 0.5, colors.background),
        width: '100%',
        height: SCORE_CORRECT_HEIGHT,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        border,
    }
    if (!props.friends) {
        return (
            <div style={greyedOut}>Pending Friend Request</div>
        )
    }
    if (props.corrects === null) {
        return (
            <div style={greyedOut}>Not Done Yet</div>
        )
    }
    const corrects = props.corrects
    return (
        <div
            className="testing-friend-score"
            style={{ display: 'flex', flexDirection: 'row', height: SCORE_CORRECT_HEIGHT }}
        >
            {corrects.map((correct, idx) => (
                <div
                    className={correct ? 'testing-friend-score-correct' : 'testing-friend-score-incorrect'}
                    key={idx}
                    style={{
                        backgroundColor: correct ? juxtaColors.correct : juxtaColors.incorrect,
                        width: `${100 / corrects.length}%`,
                        border,
                    }}
                >
                </div>
            ))}
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
        <div style={{ display: 'flex', flexDirection: 'row', height: ADD_FRIEND_HEIGHT, alignItems: 'center' }}>
            <div
                style={{ width: '37.5%', padding: '0 0.2em' }}
            >
                <input
                    type="text"
                    placeholder="Friend name"
                    value={friendName}
                    style={{ width: '100%', height: '100%' }}
                    onChange={(e) => { setFriendName(e.target.value) }}
                />
            </div>
            <div
                style={{ width: '37.5%', padding: '0 0.2em', height: ADD_FRIEND_HEIGHT }}
            >
                <input
                    type="text"
                    placeholder="Friend ID"
                    value={friendID}
                    style={{ width: '100%', height: '100%' }}
                    onChange={(e) => { setFriendID(e.target.value) }}
                />
            </div>
            <div style={{ width: '25%', display: 'flex', height: ADD_FRIEND_HEIGHT }}>
                <button
                    onClick={addFriend}
                    style={{ marginLeft: '1em', height: '100%' }}
                >
                    Add
                </button>
            </div>
        </div>
    )
}
