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
    const [friendScores, setFriendScores] = useState([] as FriendScore[])

    useEffect(() => {
        void (async () => {
            // map name to id for quizFriends
            const quizIDtoName = Object.fromEntries(props.quizFriends.map(x => [x[1], x[0]]))
            const requesters = props.quizFriends.map(x => x[1])
            const user = unique_persistent_id()
            const secureID = unique_secure_id()
            const friendScoresPromise = fetch(`${ENDPOINT}/juxtastat/todays_score_for`, {
                method: 'POST',
                body: JSON.stringify({ user, secureID, date: props.date, requesters, quiz_kind: props.quizKind }),
                headers: {
                    'Content-Type': 'application/json',
                },
            }).then(x => x.json())
            const friendScoresResponse = (await friendScoresPromise) as { results: { corrects: boolean[] | null, friends: boolean }[] } | { error: string }
            if ('error' in friendScoresResponse) {
                // probably some kind of auth error. Handled elsewhere
                return
            }
            setFriendScores(friendScoresResponse.results.map(
                (x, idx) => ({ name: quizIDtoName[requesters[idx]], corrects: x.corrects, friends: x.friends }),
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
                    index={-1}
                    quizFriends={props.quizFriends}
                    setQuizFriends={props.setQuizFriends}
                />

                {
                    friendScores.map((friendScore, idx) => (
                        <FriendScore
                            key={idx}
                            index={idx}
                            friendScore={friendScore}
                            removeFriend={() => {
                                void (async () => {
                                    await fetch(`${ENDPOINT}/juxtastat/unfriend`, {
                                        method: 'POST',
                                        body: JSON.stringify({ user: unique_persistent_id(), secureID: unique_secure_id(), requestee: props.quizFriends[idx][1] }),
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                    })
                                    const newQuizFriends = props.quizFriends.filter(x => x[0] !== friendScore.name)
                                    props.setQuizFriends(newQuizFriends)
                                })()
                            }}
                            quizFriends={props.quizFriends}
                            setQuizFriends={props.setQuizFriends}
                        />
                    ),
                    )
                }
            </>
            <div style={{ height: '1em' }} />
            <AddFriend quizFriends={props.quizFriends} setQuizFriends={props.setQuizFriends} />
        </div>
    )
}

const SCORE_CORRECT_HEIGHT = '2em'
const ADD_FRIEND_HEIGHT = '1.5em'

function FriendScore(props: {
    index: number
    friendScore: FriendScore
    removeFriend?: () => void
    quizFriends: QuizFriends
    setQuizFriends: (x: QuizFriends) => void
}): ReactNode {
    const [error, setError] = useState<string | undefined>(undefined)

    const renameFriend = props.removeFriend === undefined
        ? undefined
        : (name: string): void => {
                if (name === '') {
                    setError('Friend name cannot be empty')
                    return
                }
                if (props.quizFriends.map(x => x[0]).includes(name)) {
                    setError('Friend name already exists')
                    return
                }
                const newQuizFriends = [...props.quizFriends]
                newQuizFriends[props.index] = [name, props.quizFriends[props.index][1]]
                props.setQuizFriends(newQuizFriends)
                setError(undefined)
            }

    const row = (
        <div
            style={{ display: 'flex', flexDirection: 'row', height: SCORE_CORRECT_HEIGHT, alignItems: 'center' }}
            className="testing-friends-section"
        >
            <div style={{ width: '25%' }}>
                <FriendScoreName name={props.friendScore.name} renameFriend={renameFriend} />
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
    return <WithError error={error} content={row} />
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
            {corrects.map((correct, idx) => {
                const color = correct ? juxtaColors.correct : juxtaColors.incorrect
                return (
                    <div
                        className={correct ? 'testing-friend-score-correct' : 'testing-friend-score-incorrect'}
                        key={idx}
                        style={{
                            backgroundColor: color,
                            color,
                            width: `${100 / corrects.length}%`,
                            border,
                        }}
                    >
                        {correct ? 'y' : 'n'}
                    </div>
                )
            })}
        </div>
    )
}

function AddFriend(props: {
    quizFriends: QuizFriends
    setQuizFriends: (x: QuizFriends) => void
}): ReactNode {
    const [friendName, setFriendName] = useState('')
    const [friendID, setFriendID] = useState('')
    const [error, setError] = useState<string | undefined>(undefined)

    const addFriend = async (): Promise<void> => {
        if (friendName === '') {
            setError('Friend name cannot be empty')
            return
        }
        if (friendID === '') {
            setError('Friend ID cannot be empty')
            return
        }
        if (friendID === unique_persistent_id()) {
            setError('Friend ID cannot be your own ID')
            return
        }
        if (props.quizFriends.map(x => x[0]).includes(friendName)) {
            setError('Friend name already exists')
            return
        }
        if (props.quizFriends.map(x => x[1]).includes(friendID)) {
            const friendNameDup = props.quizFriends.find(x => x[1] === friendID)![0]
            setError(`Friend ID ${friendID} already exists as ${friendNameDup}`)
            return
        }
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
        setError(undefined)
        setFriendName('')
        setFriendID('')
    }

    const form = (
        <div style={{ display: 'flex', flexDirection: 'row', height: ADD_FRIEND_HEIGHT, alignItems: 'center' }}>
            <div
                style={{ width: '37.5%', padding: '0 0.2em' }}
            >
                <input
                    type="text"
                    placeholder="Friend Name"
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
    return <WithError error={error} content={form} />
}

function WithError(props: { error?: string, content: ReactNode }): ReactNode {
    const colors = useColors()
    if (props.error !== undefined) {
        return (
            <div>
                {props.content}
                <div style={{ backgroundColor: colors.slightlyDifferentBackgroundFocused, padding: '0 0.5em', marginRight: '25%' }}>
                    {props.error}
                </div>
            </div>
        )
    }
    return props.content
}
