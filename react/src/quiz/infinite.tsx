import React from 'react'
import seedrandom from 'seedrandom'

import quiz_infinite from '../data/quiz_infinite'
import { loadProtobuf } from '../load_json'
import { useJuxtastatColors } from '../page_template/colors'
import { QuizFullData } from '../utils/protos'

import { QuizQuestion } from './quiz'

type QuizInfiniteForVersion = typeof quiz_infinite[number]

export const validQuizInfiniteVersions = quiz_infinite.map((x: QuizInfiniteForVersion) => x.juxtaVersion)

const juxtaInfiniteInitialLives = 3
export const juxtaInfiniteCorrectForBonus = 5

type QuizQuestionChunks = readonly { path: string, totalP: number }[]

function sampleChunk(rng: seedrandom.PRNG, chunks: QuizQuestionChunks): string {
    const probeP = rng()
    let totalP = 0
    for (const chunk of chunks) {
        totalP += chunk.totalP
        if (probeP < totalP) {
            return chunk.path
        }
    }
    throw new Error('Invalid chunk distribution')
}

function sampleTroncheIndex(rng: seedrandom.PRNG, negLogProbX10: number[]): number {
    const probeP = rng()
    let totalP = 0
    for (let i = 0; i < negLogProbX10.length; i++) {
        totalP += Math.exp(-negLogProbX10[i] / 10)
        if (probeP < totalP) {
            return i
        }
    }
    throw new Error('Invalid tronche distribution')
}

function quizForVersion(version: number): QuizInfiniteForVersion {
    for (const quiz of quiz_infinite) {
        if (quiz.juxtaVersion === version) {
            return quiz
        }
    }
    throw new Error('Invalid version')
}

let quizSamplingData: Promise<QuizFullData> | null = null
function loadQuizSamplingData(version: number): Promise<QuizFullData> {
    // cache the data
    if (quizSamplingData === null) {
        quizSamplingData = loadProtobuf(`/quiz_sampling_info/${version}/data.gz`, 'QuizFullData')
    }
    return quizSamplingData
}

export async function sampleRandomQuestion(seed: string, version: number, index: number): Promise<QuizQuestion> {
    const seedFull = `${seed}-${index}`
    const rng = seedrandom(seedFull)
    const whichQ = Math.floor(rng() * 5)
    const quizInfiniteV = quizForVersion(version)
    const chunks = quizInfiniteV.questionDistribution[whichQ]
    const chunk = sampleChunk(rng, chunks satisfies QuizQuestionChunks)
    const tronche = await loadProtobuf(chunk, 'QuizQuestionTronche')
    const data = await loadQuizSamplingData(version)
    const troncheIdx = sampleTroncheIndex(rng, tronche.negLogProbX10MinusBasis.map(x => x + tronche.negLogProbX10Basis))
    let geoA = tronche.geographyA[troncheIdx]
    let geoB = tronche.geographyB[troncheIdx]
    if (rng() < 0.5) {
        [geoA, geoB] = [geoB, geoA]
    }
    const stat = tronche.stat[troncheIdx]
    const statName = quizInfiniteV.allStatNames[stat]
    const statPath = quizInfiniteV.statPaths[stat]
    const question: string = quizInfiniteV.statQuestionNames[stat]
    const sA = data.stats[stat].stats![geoA]
    const sB = data.stats[stat].stats![geoB]
    return {
        stat_a: sA,
        stat_b: sB,
        question,
        longname_a: quizInfiniteV.allGeographies[geoA],
        longname_b: quizInfiniteV.allGeographies[geoB],
        kind: 'juxtastat',
        stat_column: statName,
        stat_path: statPath,
    } satisfies QuizQuestion
}

export function infiniteQuizIsDone(correctPattern: (boolean | 0 | 1)[]): boolean {
    return numLives(correctPattern) === 0
}

export function numLives(correctPattern: (boolean | 0 | 1)[]): number {
    let lives = juxtaInfiniteInitialLives
    let correctRun = 0
    for (const i of correctPattern.keys()) {
        if (correctPattern[i]) {
            correctRun++
            if (correctRun >= juxtaInfiniteCorrectForBonus) {
                lives++
                correctRun = 0
            }
        }
        else {
            lives--
            correctRun = 0
        }
        if (lives <= 0) {
            return 0
        }
    }
    return lives
}

export function JuxtastatLivesDisplay(props: { correctPattern: boolean[] }): React.ReactNode {
    const colors = useJuxtastatColors()
    let lives = numLives(props.correctPattern)
    const images: [string, string][] = []
    for (const i of Array(juxtaInfiniteInitialLives).keys()) {
        images.push(i < lives ? [colors.lifeEmoji, 'testing-life-emoji'] : [colors.lifeLostEmoji, 'testing-life-emoji-lost'])
    }
    while (lives > juxtaInfiniteInitialLives) {
        images.push([colors.lifeEmoji, 'testing-life-emoji'])
        lives--
    }
    return (
        <div
            className="quiz_footer testing-life-display"
            style={{
                margin: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '3em',
                gap: '0.25em',
            }}
        >
            {images.map(([src, className], i) => <img key={i} className={className} src={src} alt="" style={{ height: '2.5em' }} />)}
        </div>
    )
}
