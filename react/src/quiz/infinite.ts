import seedrandom from 'seedrandom'

import quiz_infinite from '../data/quiz_infinite'

import { QuizQuestion } from './quiz'
import { loadProtobuf } from '../load_json'
import statistic_list from '../data/statistic_list'
import statistic_name_list from '../data/statistic_name_list'
import statistic_path_list from '../data/statistic_path_list'

type QuizQuestionChunks = readonly {path: string, totalP: number}[]

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

function sampleTroncheIndex(rng: seedrandom.PRNG, negLogProbX100: number[]) {
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

export async function sampleRandomQuestion(seed: string, index: number): Promise<QuizQuestion> {
    const seedFull = `${seed}-${index}`
    const rng = seedrandom(seedFull)
    const whichQ = Math.floor(rng() * 5)
    const chunks = quiz_infinite.questionDistribution[whichQ]
    const chunk = sampleChunk(rng, chunks satisfies QuizQuestionChunks)
    const tronche = await loadProtobuf(chunk, 'QuizQuestionTronche')
    const troncheIdx = sampleTroncheIndex(rng, tronche.negLogProbX100)
    let geoA = tronche.geographyA[troncheIdx]
    let geoB = tronche.geographyB[troncheIdx]
    if (rng() < 0.5) {
        [geoA, geoB] = [geoB, geoA]
    }
    const stat = quiz_infinite.allStats[tronche.stat[troncheIdx]]
    const statName = statistic_name_list[statistic_list.indexOf(stat)]
    const statPath = statistic_path_list[statistic_list.indexOf(stat)]
    console.log(chunk)
    console.log(tronche)
    return {
        stat_a: 0,
        stat_b: 1,
        question: 'Which region is better?',
        longname_a: quiz_infinite.allGeographies[geoA],
        longname_b: quiz_infinite.allGeographies[geoB],
        kind: 'juxtastat',
        stat_column: statName,
        stat_path: statPath,
    } satisfies QuizQuestion
    // throw new Error('Not implemented')
}

export function infiniteQuizIsDone(correctPattern: boolean[]): boolean {
    // TODO fix
    return false
}
