import React, { ReactNode, useEffect, useState } from 'react'

import { EditableString } from '../components/table'
import { useColors, useJuxtastatColors } from '../page_template/colors'
import { mixWithBackground } from '../utils/color'

import { endpoint, QuizFriends, QuizKindWithStats } from './quiz'
import { CorrectPattern } from './quiz-result'
import { uniquePersistentId, uniqueSecureId } from './statistics'

interface FriendScore { name?: string, corrects: CorrectPattern | null, friends: boolean, idError?: string }

export function QuizFriendsPanel(props: {
    quizFriends: QuizFriends
    setQuizFriends: (quizFriends: QuizFriends) => void
    quizKind: QuizKindWithStats
    date: number
    myCorrects: CorrectPattern
}): ReactNode {
    const [friendScores, setFriendScores] = useState([] as FriendScore[])

    useEffect(() => {
        void (async () => {
            // map name to id for quizFriends
            const quizIDtoName = Object.fromEntries(props.quizFriends.map(x => [x[1], x[0]]))
            const requesters = props.quizFriends.map(x => x[1])
            const user = uniquePersistentId()
            const secureID = uniqueSecureId()
            const friendScoresPromise = fetch(`${endpoint}/juxtastat/todays_score_for`, {
                method: 'POST',
                body: JSON.stringify({ user, secureID, date: props.date, requesters, quiz_kind: props.quizKind }),
                headers: {
                    'Content-Type': 'application/json',
                },
            }).then(x => x.json())
            const friendScoresResponse = (await friendScoresPromise) as { results: { corrects: CorrectPattern | null, friends: boolean, idError?: string }[] } | { error: string }
            if ('error' in friendScoresResponse) {
                // probably some kind of auth error. Handled elsewhere
                return
            }
            setFriendScores(friendScoresResponse.results.map(
                (x, idx) => ({ name: quizIDtoName[requesters[idx]], corrects: x.corrects, friends: x.friends, idError: x.idError }),
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
                                    await fetch(`${endpoint}/juxtastat/unfriend`, {
                                        method: 'POST',
                                        body: JSON.stringify({ user: uniquePersistentId(), secureID: uniqueSecureId(), requestee: props.quizFriends[idx][1] }),
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

const scoreCorrectHeight = '2em'
const addFriendHeight = '1.5em'

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
            style={{ display: 'flex', flexDirection: 'row', height: scoreCorrectHeight, alignItems: 'center' }}
            className="testing-friends-section"
        >
            <div style={{ width: '25%' }}>
                <FriendScoreName name={props.friendScore.name} renameFriend={renameFriend} />
            </div>
            <div style={{ width: '50%' }}>
                <FriendScoreCorrects {...props.friendScore} />
            </div>
            <div style={{ width: '25%', display: 'flex', height: addFriendHeight }}>
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
        height: scoreCorrectHeight,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        border,
    }
    if (props.idError !== undefined) {
        return (
            <div style={greyedOut}>{props.idError}</div>
        )
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
            style={{ display: 'flex', flexDirection: 'row', height: scoreCorrectHeight }}
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
    const [friendNameField, setFriendNameField] = useState('')
    const [friendIDField, setFriendIDField] = useState('')
    const [error, setError] = useState<string | undefined>(undefined)

    const addFriend = async (): Promise<void> => {
        const friendID = friendIDField.trim()
        const friendName = friendNameField.trim()
        if (friendName === '') {
            setError('Friend name cannot be empty')
            return
        }
        if (friendID === '') {
            setError('Friend ID cannot be empty')
            return
        }
        if (friendID === uniquePersistentId()) {
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
        const user = uniquePersistentId()
        const secureID = uniqueSecureId()
        await fetch(`${endpoint}/juxtastat/friend_request`, {
            method: 'POST',
            body: JSON.stringify({ user, secureID, requestee: friendID }),
            headers: {
                'Content-Type': 'application/json',
            },
        })
        props.setQuizFriends([...props.quizFriends, [friendName, friendID]])
        setError(undefined)
        setFriendNameField('')
        setFriendIDField('')
    }

    const form = (
        <div style={{ display: 'flex', flexDirection: 'row', height: addFriendHeight, alignItems: 'center' }}>
            <div
                style={{ width: '37.5%', padding: '0 0.2em' }}
            >
                <input
                    type="text"
                    placeholder="Friend Name"
                    value={friendNameField}
                    style={{ width: '100%', height: '100%' }}
                    onChange={(e) => { setFriendNameField(e.target.value) }}
                />
            </div>
            <div
                style={{ width: '37.5%', padding: '0 0.2em', height: addFriendHeight }}
            >
                <input
                    type="text"
                    placeholder="Friend ID"
                    value={friendIDField}
                    style={{ width: '100%', height: '100%' }}
                    onChange={(e) => { setFriendIDField(e.target.value) }}
                />
            </div>
            <div style={{ width: '25%', display: 'flex', height: addFriendHeight }}>
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
