import assert from 'assert/strict'
import { readdirSync, readFileSync } from 'fs'
import { test } from 'node:test'

import './util/localStorage'
import './util/window'
import { dayStart, retrostatWeekAskingDay } from '../src/quiz/dates'
import { JuxtaQuestionJSON, RetroQuestionJSON } from '../src/quiz/quiz'

const storedQuizzes = '../stored_quizzes'

function questionKey(question: JuxtaQuestionJSON): string {
    return JSON.stringify([question.stat_column, question.longname_a, question.longname_b])
}

void test('day 0 is a Saturday, so archive rows of Sunday to Saturday hold whole Retrostat weeks', () => {
    assert.equal(dayStart(0).getDay(), 6)
})

void test('every stored Retrostat asks questions from the Juxtastat days of its week', () => {
    // A question can recur on another day
    const daysOfQuestion = new Map<string, number[]>()
    for (const day of readdirSync(`${storedQuizzes}/juxtastat`)) {
        for (const question of JSON.parse(readFileSync(`${storedQuizzes}/juxtastat/${day}`, 'utf-8')) as JuxtaQuestionJSON[]) {
            const key = questionKey(question)
            daysOfQuestion.set(key, [...daysOfQuestion.get(key) ?? [], parseInt(day)])
        }
    }
    const weeks = readdirSync(`${storedQuizzes}/retrostat`)
    assert(weeks.length > 100)
    for (const week of weeks) {
        for (const retro of JSON.parse(readFileSync(`${storedQuizzes}/retrostat/${week}`, 'utf-8')) as RetroQuestionJSON[]) {
            for (const question of [retro.a, retro.b]) {
                const weeksAsking = (daysOfQuestion.get(questionKey(question)) ?? []).map(retrostatWeekAskingDay)
                assert(weeksAsking.includes(parseInt(week)), `W${week} asks ${questionKey(question)}, from weeks ${weeksAsking}`)
            }
        }
    }
})
