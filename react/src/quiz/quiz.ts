import { saveAs } from 'file-saver'
import { z } from 'zod'

import { loadQuizHistory } from '../components/quiz-panel'
import { cancelled, uploadFile } from '../upload-util'

import { unique_persistent_id } from './statistics'

export type QuizDescriptor = { kind: 'juxtastat', name: number } | { kind: 'retrostat', name: string }

export const ENDPOINT = 'https://persistent.urbanstats.org'

export interface JuxtaQuestionJSON { stat_a: number, stat_b: number, question: string, longname_a: string, longname_b: string, stat_column: string };
export interface JuxtaQuestion extends JuxtaQuestionJSON { kind: 'juxtastat' }
export interface RetroQuestionJSON { a_ease: number, b_ease: number, a: JuxtaQuestionJSON, b: JuxtaQuestionJSON };
export interface RetroQuestion { kind: 'retrostat', a_ease: number, b_ease: number, a: JuxtaQuestion, b: JuxtaQuestion }
export type QuizQuestion = JuxtaQuestion | RetroQuestion

export function a_correct(quiz: QuizQuestion): boolean {
    switch (quiz.kind) {
        case 'juxtastat':
            return quiz.stat_a > quiz.stat_b
        case 'retrostat':
            return quiz.a_ease > quiz.b_ease
    }
}

export function nameOfQuizKind(quiz_kind: 'juxtastat' | 'retrostat'): string {
    return quiz_kind.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        },
    )
}

export function load_juxta(quiz: JuxtaQuestionJSON): JuxtaQuestion {
    return { kind: 'juxtastat', ...quiz }
}

export function load_retro(quiz: RetroQuestionJSON): RetroQuestion {
    return { kind: 'retrostat', a: load_juxta(quiz.a), b: load_juxta(quiz.b), a_ease: quiz.a_ease, b_ease: quiz.b_ease }
}

export const quizHistorySchema = z.record(
    z.string(),
    z.object({
        choices: z.array(z.union([z.literal('A'), z.literal('B')])),
        correct_pattern: z.array(z.boolean()),
    })
        .strict()
        .refine(quiz => quiz.choices.length === quiz.correct_pattern.length, { message: 'Quiz choices must be the same length as quiz correct_pattern' }),
)

export type QuizHistory = z.infer<typeof quizHistorySchema>

export const quizPersonaSchema = z.object({
    persistent_id: z.string(),
    quiz_history: quizHistorySchema,
    date_exported: z.optional(z.string().pipe(z.coerce.date())),
}).strict()

export type QuizPersona = z.infer<typeof quizPersonaSchema>

export function deleteQuizPersona(): void {
    if (confirm(`This will DELETE ALL your Juxtastat and Retrostat progress.

        Your existing Juxtastat and Retrostat progress will be lost.

        Recommend downloading your current progress so you can restore it later.

        Continue?`)){
            localStorage.removeItem('quiz_history')
            localStorage.removeItem('persistent_id')
            window.location.reload()
        }
}

export function exportQuizPersona(): void {
    const exported: QuizPersona = {
        date_exported: new Date(),
        persistent_id: unique_persistent_id(),
        quiz_history: loadQuizHistory(),
    }
    const data = JSON.stringify(exported, null, 2)
    saveAs(new Blob([data], { type: 'application/json' }), `urbanstats_quiz_${exported.persistent_id}.json`)
}

function mergeHistories(data1: QuizHistory, data2: QuizHistory): QuizHistory{ // merge in favor of data1
    const mergedData: QuizHistory = { ...data1 }
    for (const key in data2) {
        if (data2.hasOwnProperty(key)) {
            if (!(key in mergedData)) {
                mergedData[key] = data2[key]
            }
        }
    }
    return mergedData
}

export async function importQuizPersona(): Promise<void> {
    const file = await uploadFile('.json')
    if (file === cancelled) {
        return
    }

    try {
        const text = await file.text()
        const persona = quizPersonaSchema.parse(JSON.parse(text))
        let overwrite: boolean
        if (localStorage.getItem('quiz_history')!==null) {  // no reason to confirm if they don't have any data in the first place'
            overwrite = confirm(`The uploaded progress will be preferentially merged with your current Juxtastat and Retrostat progress.

            Your existing Juxtastat and Retrostat progress, if different from what is uploaded, will be lost.

            Recommend downloading your current progress so you can restore it later.

            Continue?`)
        } else {
            overwrite = true;
        }
        if (overwrite) {
            localStorage.setItem('quiz_history', JSON.stringify(mergeHistories(persona.quiz_history, loadQuizHistory())))
            localStorage.setItem('persistent_id', persona.persistent_id)
            window.location.reload()
        }
    }
    catch (error) {
        alert(`Could not parse file. Error: ${error}`)
    }
}
