import React, { CSSProperties, ReactNode, useContext, useEffect, useState } from 'react'
import { GridLoader, MoonLoader } from 'react-spinners'

import { EditableString } from '../components/editable-field'
import { Navigator } from '../navigation/Navigator'
import { urlFromPageDescriptor } from '../navigation/PageDescriptor'
import { useColors, useJuxtastatColors } from '../page_template/colors'
import { mixWithBackground } from '../utils/color'
import { persistentClient } from '../utils/urbanstats-persistent-client'

import { AuthenticationStateMachine } from './AuthenticationStateMachine'
import { addFriend } from './friends'
import { QuizDescriptorWithTime, QuizDescriptorWithStats, QuizFriends, QuizModel, QuizDescriptor } from './quiz'
import { CorrectPattern } from './quiz-result'
import { parseTimeIdentifier } from './statistics'

export type ResultToDisplayForFriends = { corrects: CorrectPattern | null } | { forThisSeed: number | null, maxScore: number | null, maxScoreSeed: string | null, maxScoreVersion: number | null }

type FriendResponse = { result: ResultToDisplayForFriends, friends: true } | { friends: false }
type FriendScore = { name?: string } & FriendResponse

async function juxtaRetroResponse(
    quizDescriptor: QuizDescriptorWithTime,
    requesters: string[],
): Promise<FriendResponse[] | undefined> {
    const date = parseTimeIdentifier(quizDescriptor.kind, quizDescriptor.name.toString())
    const { data: friendScoresResponse } = await persistentClient.POST('/juxtastat/todays_score_for', {
        params: {
            header: QuizModel.shared.userHeaders(),
        },
        body: {
            date,
            requesters,
            quiz_kind: quizDescriptor.kind,
        },
    })
    if (friendScoresResponse === undefined) {
        return undefined // Probably some sort of auth error, handled elsewhere
    }
    return friendScoresResponse.results.map(x => x.friends ? { friends: true, result: x } : { friends: false })
}

async function infiniteResponse(
    quizDescriptor: QuizDescriptor & { kind: 'infinite' },
    requesters: string[],
): Promise<FriendResponse[] | undefined> {
    const { data: friendScoresResponse } = await persistentClient.POST('/juxtastat/infinite_results', {
        params: {
            header: QuizModel.shared.userHeaders(),
        },
        body: {
            requesters, seed: quizDescriptor.seed, version: quizDescriptor.version,
        },
    })
    if (friendScoresResponse === undefined) {
        return undefined // Probably some sort of auth error, handled elsewhere
    }
    return friendScoresResponse.results.map(x => x.friends ? { friends: true, result: x } : { friends: false })
}

export function QuizFriendsPanel(props: {
    quizFriends: QuizFriends
    setQuizFriends: (quizFriends: QuizFriends) => void
    quizDescriptor: QuizDescriptorWithStats
    myResult: ResultToDisplayForFriends
}): ReactNode {
    const colors = useColors()

    const [friendScores, setFriendScores] = useState([] as FriendScore[])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | undefined>(undefined)

    const user = QuizModel.shared.uniquePersistentId.use()
    const secureID = QuizModel.shared.uniqueSecureId.use()

    useEffect(() => {
        void (async () => {
            setIsLoading(true)
            setError(undefined)
            try {
                const friends = props.quizFriends.filter(([name]) => name !== null) as [string, string, number | undefined][]
                // map name to id for quizFriends
                const quizIDtoName = Object.fromEntries(friends.map(([name, id]) => [id, name]))
                const requesters = friends.map(x => x[1])
                const friendScoresResponse
                    = props.quizDescriptor.kind === 'infinite'
                        ? await infiniteResponse(props.quizDescriptor, requesters)
                        : await juxtaRetroResponse(props.quizDescriptor, requesters)
                if (friendScoresResponse === undefined) {
                    return
                }
                setFriendScores(friendScoresResponse.map(
                    (x, idx) => ({ name: quizIDtoName[requesters[idx]], ...x }),
                ))
            }
            catch {
                setError('Network Error')
            }
            finally {
                setIsLoading(false)
            }
        })()
    }, [props.quizDescriptor, props.quizFriends, user, secureID])

    const allResults = [props.myResult, ...friendScores.flatMap(x => x.friends ? [x.result] : [])]

    const content = (
        <div>
            <div style={{ margin: 'auto', width: '100%' }}>
                <div className="quiz_summary">Friends</div>
            </div>
            <>
                {props.quizDescriptor.kind === 'infinite' ? <InfiniteHeader /> : undefined}
                <PlayerScore result={props.myResult} otherResults={allResults} />

                {
                    friendScores.map((friendScore, idx) => (
                        <FriendScore
                            key={idx}
                            index={idx}
                            friendScore={friendScore}
                            removeFriend={async () => {
                                await persistentClient.POST('/juxtastat/unfriend', {
                                    params: {
                                        header: QuizModel.shared.userHeaders(),
                                    },
                                    body: {
                                        requestee: props.quizFriends[idx][1],
                                    },
                                })
                                const newQuizFriends = props.quizFriends.map<[string | null, string, number] | [string, string]>(tuple => tuple[0] === friendScore.name ? [null, tuple[1], Date.now()] : tuple)
                                props.setQuizFriends(newQuizFriends)
                            }}
                            quizFriends={props.quizFriends}
                            setQuizFriends={props.setQuizFriends}
                            otherResults={allResults}
                        />
                    ),
                    )
                }
            </>
            <div style={{ height: '1em' }} />
            <AddFriend />
        </div>
    )

    const spinnerSize = '78px'
    const spinnerStyle: CSSProperties = {
        position: 'absolute',
        left: `calc(50% - ${spinnerSize} / 2)`,
        top: `calc(50% - ${spinnerSize} / 2)`,
    }

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ opacity: isLoading ? 0.5 : 1, pointerEvents: isLoading ? 'none' : undefined }}>
                <WithError content={content} error={error} />
            </div>
            {isLoading ? <MoonLoader size={spinnerSize} color={colors.textMain} cssOverride={spinnerStyle} /> : null}
        </div>
    )
}

function InfiniteHeader(): ReactNode {
    return (
        <div
            style={{ display: 'flex', flexDirection: 'row', height: scoreCorrectHeight, alignItems: 'center' }}
            className="testing-friends-section"
        >
            <div style={{ width: '25%' }} />
            <div style={{ width: '50%', display: 'flex', flexDirection: 'row' }}>
                <div style={{ width: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    On This Seed
                </div>
                <div style={{ width: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    Overall Best
                </div>
            </div>
            <div style={{ width: '25%' }} />
        </div>
    )
}

const scoreCorrectHeight = '2em'
const addFriendHeight = '1.5em'

function PlayerScore(props: { result: ResultToDisplayForFriends, otherResults: ResultToDisplayForFriends[] }): ReactNode {
    const copyFriendLink = async (): Promise<void> => {
        const playerName = prompt('Enter your name:')

        if (playerName === null) {
            return
        }

        const hash = urlFromPageDescriptor({ kind: 'quiz', id: AuthenticationStateMachine.shared.state.email ?? QuizModel.shared.uniquePersistentId.value, name: playerName }).hash
        const url = `https://juxtastat.org/${hash}`

        await navigator.clipboard.writeText(url)

        alert('Link copied to clipboard!')
    }

    return (
        <div
            style={{ display: 'flex', flexDirection: 'row', height: scoreCorrectHeight, alignItems: 'center' }}
            className="testing-friends-section"
        >
            <div style={{ width: '25%' }}>
                You
            </div>
            <div style={{ width: '50%' }}>
                <FriendScoreCorrects result={props.result} friends={true} otherResults={props.otherResults} />
            </div>
            <div style={{ width: '25%', display: 'flex', height: addFriendHeight }}>
                <button
                    onClick={copyFriendLink}
                    style={{ marginLeft: '1em' }}
                    data-test-id="friend-link-button"
                >
                    Copy Link
                </button>
            </div>
        </div>
    )
}

function FriendScore(props: {
    index: number
    friendScore: FriendScore
    removeFriend: () => Promise<void>
    quizFriends: QuizFriends
    setQuizFriends: (x: QuizFriends) => void
    otherResults: ResultToDisplayForFriends[]
}): ReactNode {
    const colors = useColors()

    const [error, setError] = useState<string | undefined>(undefined)
    const [loading, setLoading] = useState(false)

    const renameFriend = (name: string): void => {
        if (name === '') {
            setError('Friend name cannot be empty')
            return
        }
        if (props.quizFriends.map(x => x[0]).includes(name)) {
            setError('Friend name already exists')
            return
        }
        const newQuizFriends = [...props.quizFriends]
        newQuizFriends[props.index] = [name, props.quizFriends[props.index][1], Date.now()]
        props.setQuizFriends(newQuizFriends)
        setError(undefined)
    }

    const removeFriend = async (): Promise<void> => {
        setLoading(true)
        try {
            await props.removeFriend()
        }
        catch {
            setError('Network Error')
        }
        finally {
            setLoading(false)
        }
    }

    const row = (
        <div
            style={{ display: 'flex', flexDirection: 'row', height: scoreCorrectHeight, alignItems: 'center' }}
            className="testing-friends-section"
        >
            <div style={{ width: '25%' }}>
                <EditableString
                    content={props.friendScore.name ?? 'Unknown'}
                    onNewContent={renameFriend}
                    style={{ width: '100%', height: '100%' }}
                    inputMode="text"
                />
            </div>
            <div style={{ width: '50%' }}>
                <FriendScoreCorrects {...props.friendScore} otherResults={props.otherResults} />
            </div>
            <div style={{ width: '25%', display: 'flex', height: addFriendHeight }}>
                <button
                    onClick={removeFriend}
                    style={{ marginLeft: '1em' }}
                    disabled={loading}
                >
                    Remove
                </button>
                {loading ? <GridLoader color={colors.textMain} size="4px" cssOverride={{ marginLeft: '10px' }} /> : null}

            </div>
        </div>
    )
    return <WithError error={error} content={row} />
}

function FriendScoreCorrects(props: FriendScore & { otherResults: ResultToDisplayForFriends[] }): ReactNode {
    const colors = useColors()
    const juxtaColors = useJuxtastatColors()
    const navContext = useContext(Navigator.Context)
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
    if (!props.friends) {
        return (
            <div style={greyedOut}>
                Ask&nbsp;
                <b>
                    {props.name}
                </b>
                &nbsp;to add you
            </div>
        )
    }
    if ('forThisSeed' in props.result) {
        const link
            = props.result.maxScoreSeed === null || props.result.maxScoreVersion === null
                // eslint-disable-next-line @typescript-eslint/no-empty-function -- this is a dummy onClick function for when there is no link
                ? { href: undefined, onClick: () => { } }
                : navContext.link({
                    kind: 'quiz', mode: 'infinite', seed: props.result.maxScoreSeed, v: props.result.maxScoreVersion,
                }, { scroll: { kind: 'position', top: 0 } })
        const relevantOtherResults = props.otherResults.filter(
            x => 'forThisSeed' in x,
        )
        const baseStyle = { width: '50%', border, display: 'flex', justifyContent: 'center', alignItems: 'center', color: colors.buttonTextWhite, fontWeight: 'bold' }
        const maxMaxScore = Math.max(...relevantOtherResults.map(x => x.maxScore ?? 0)) === props.result.maxScore
        const maxForThisSeed = Math.max(...relevantOtherResults.map(x => x.forThisSeed ?? 0)) === props.result.forThisSeed
        return (
            <div style={{ display: 'flex', flexDirection: 'row', height: scoreCorrectHeight }}>
                <div style={{ ...baseStyle, backgroundColor: maxForThisSeed ? colors.hueColors.green : colors.hueColors.blue }}>
                    {props.result.forThisSeed ?? '-'}
                </div>
                <div
                    style={{ ...baseStyle, backgroundColor: maxMaxScore ? colors.hueColors.green : colors.hueColors.blue }}
                    onClick={link.onClick}
                >
                    <a style={{ textDecoration: 'none', color: colors.buttonTextWhite }} href={link.href}>{props.result.maxScore ?? '-'}</a>
                </div>
            </div>
        )
    }
    if (props.result.corrects === null) {
        return (
            <div style={greyedOut}>Not Done Yet</div>
        )
    }
    const corrects = props.result.corrects
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

function AddFriend(): ReactNode {
    const colors = useColors()

    const [friendNameField, setFriendNameField] = useState('')
    const [friendIDField, setFriendIDField] = useState('')
    const [error, setError] = useState<string | undefined>(undefined)
    const [loading, setLoading] = useState(false)

    const addFriendClick = async (): Promise<void> => {
        const friendID = friendIDField.trim()
        const friendName = friendNameField.trim()
        setLoading(true)
        const result = await addFriend(friendID, friendName)
        setLoading(false)
        if (result !== undefined) {
            setError(result.errorMessage)
        }
        else {
            setError(undefined)
            setFriendNameField('')
            setFriendIDField('')
        }
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
                    disabled={loading}
                />
            </div>
            <div
                style={{ width: '37.5%', padding: '0 0.2em', height: addFriendHeight }}
            >
                <input
                    type="text"
                    placeholder="Friend ID or Email"
                    value={friendIDField}
                    style={{ width: '100%', height: '100%' }}
                    onChange={(e) => { setFriendIDField(e.target.value) }}
                    disabled={loading}
                />
            </div>
            <div style={{ width: '25%', display: 'flex', height: addFriendHeight }}>
                <button
                    onClick={addFriendClick}
                    style={{ marginLeft: '1em', height: '100%' }}
                    disabled={loading}
                >
                    Add
                </button>
                {loading ? <GridLoader color={colors.textMain} size="4px" cssOverride={{ marginLeft: '10px' }} /> : null}
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
