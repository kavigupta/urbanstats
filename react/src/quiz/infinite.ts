import seedrandom from 'seedrandom'

import quiz_infinite from '../data/quiz_infinite'
import quiz_names from '../data/quiz_names'
import statistic_name_list from '../data/statistic_name_list'
import statistic_path_list from '../data/statistic_path_list'
import { loadProtobuf } from '../load_json'
import { QuizFullData } from '../utils/protos'

import { QuizQuestion } from './quiz'

const initialLives = 3
const correctForBonus = 5

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

function sampleTroncheIndex(rng: seedrandom.PRNG, negLogProbX100: number[]): number {
    const probeP = rng()
    let totalP = 0
    for (let i = 0; i < negLogProbX100.length; i++) {
        totalP += Math.exp(-negLogProbX100[i] / 100)
        if (probeP < totalP) {
            return i
        }
    }
    throw new Error('Invalid tronche distribution')
}

let quizSamplingData: Promise<QuizFullData> | null = null
function loadQuizSamplingData(): Promise<QuizFullData> {
    // cache the data
    if (quizSamplingData === null) {
        quizSamplingData = loadProtobuf('/quiz_sampling_info/data.gz', 'QuizFullData')
    }
    return quizSamplingData
}

export async function sampleRandomQuestion(seed: string, index: number): Promise<QuizQuestion> {
    const seedFull = `${seed}-${index}`
    const rng = seedrandom(seedFull)
    const whichQ = Math.floor(rng() * 5)
    const chunks = quiz_infinite.questionDistribution[whichQ]
    const chunk = sampleChunk(rng, chunks satisfies QuizQuestionChunks)
    const tronche = await loadProtobuf(chunk, 'QuizQuestionTronche')
    const data = await loadQuizSamplingData()
    const troncheIdx = sampleTroncheIndex(rng, tronche.negLogProbX100)
    let geoA = tronche.geographyA[troncheIdx]
    let geoB = tronche.geographyB[troncheIdx]
    if (rng() < 0.5) {
        [geoA, geoB] = [geoB, geoA]
    }
    const stat = tronche.stat[troncheIdx]
    const statName = statistic_name_list[quiz_infinite.allStats[stat]]
    const statPath = statistic_path_list[quiz_infinite.allStats[stat]]
    const question: string = quiz_names[quiz_infinite.allStats[stat]]
    const sA = data.stats[stat].stats![geoA]
    const sB = data.stats[stat].stats![geoB]
    return {
        stat_a: sA,
        stat_b: sB,
        question,
        longname_a: quiz_infinite.allGeographies[geoA],
        longname_b: quiz_infinite.allGeographies[geoB],
        kind: 'juxtastat',
        stat_column: statName,
        stat_path: statPath,
    } satisfies QuizQuestion
}

export function infiniteQuizIsDone(correctPattern: boolean[]): boolean {
    return numLives(correctPattern) === 0
}

export function numLives(correctPattern: boolean[]): number {
    let lives = initialLives
    let correctRun = 0
    for (const i of correctPattern.keys()) {
        if (correctPattern[i]) {
            correctRun++
            if (correctRun >= correctForBonus) {
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
