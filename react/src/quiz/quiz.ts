import { saveAs } from 'file-saver'
import { z } from 'zod'

import { StatPath } from '../page_template/statistic-tree'
import { cancelled, uploadFile } from '../utils/upload'

import { uniquePersistentId, uniqueSecureId } from './statistics'

export type QuizDescriptor = { kind: 'juxtastat', name: number } | { kind: 'retrostat', name: string } | { kind: 'custom', name: string }

export type QuizKind = QuizDescriptor['kind']

export type QuizKind = QuizDescriptor['kind']
export type QuizKindWithStats = 'juxtastat' | 'retrostat'

export const endpoint = 'https://persistent.urbanstats.org'

/* eslint-disable no-restricted-syntax -- Data from server */
// stat_path is optional for backwards compatibility
export interface JuxtaQuestionJSON { stat_a: number, stat_b: number, question: string, longname_a: string, longname_b: string, stat_column: string, stat_path?: StatPath };
export interface JuxtaQuestion extends JuxtaQuestionJSON { kind: 'juxtastat' }
export interface RetroQuestionJSON { a_ease: number, b_ease: number, a: JuxtaQuestionJSON, b: JuxtaQuestionJSON };
export interface RetroQuestion { kind: 'retrostat', a_ease: number, b_ease: number, a: JuxtaQuestion, b: JuxtaQuestion }
export type QuizQuestion = JuxtaQuestion | RetroQuestion
export interface CustomQuizContent { name: string, questions: QuizQuestion[] }
export type QuizDescriptorWithStats = QuizDescriptor & { kind: QuizKindWithStats }

/* eslint-enable no-restricted-syntax */

export function aCorrect(quiz: QuizQuestion): boolean {
    switch (quiz.kind) {
        case 'juxtastat':
            return quiz.stat_a > quiz.stat_b
        case 'retrostat':
            return quiz.a_ease > quiz.b_ease
    }
}

export function nameOfQuizKind(quizKind: QuizKind): string {
    return quizKind.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        },
    )
}

export function loadJuxta(quiz: JuxtaQuestionJSON): JuxtaQuestion {
    return { kind: 'juxtastat', ...quiz }
}

export function loadRetro(quiz: RetroQuestionJSON): RetroQuestion {
    return { kind: 'retrostat', a: loadJuxta(quiz.a), b: loadJuxta(quiz.b), a_ease: quiz.a_ease, b_ease: quiz.b_ease }
}

export const quizHistorySchema = z.record(
    z.string(),
    z.object({
        choices: z.array(z.union([z.literal('A'), z.literal('B')])),
        correct_pattern: z.array(z.union([z.boolean(), z.literal(0), z.literal(1)])),
    })
        .strict()
        .refine(quiz => quiz.choices.length === quiz.correct_pattern.length, { message: 'Quiz choices must be the same length as quiz correct_pattern' }),
)

export type QuizHistory = z.infer<typeof quizHistorySchema>

// list of [string, string] pairs
export const quizFriends = z.array(z.tuple([z.string(), z.string()]))

export type QuizFriends = z.infer<typeof quizFriends>

export const quizPersonaSchema = z.object({
    persistent_id: z.string(),
    secure_id: z.string(),
    quiz_history: quizHistorySchema,
    quiz_friends: quizFriends,
    date_exported: z.optional(z.string().pipe(z.coerce.date())),
}).strict()

export type QuizPersona = z.infer<typeof quizPersonaSchema>

export function exportQuizPersona(): void {
    const exported: QuizPersona = {
        date_exported: new Date(),
        persistent_id: uniquePersistentId(),
        secure_id: uniqueSecureId(),
        quiz_history: loadQuizHistory(),
        quiz_friends: loadQuizFriends(),
    }
    const data = JSON.stringify(exported, null, 2)
    saveAs(new Blob([data], { type: 'application/json' }), `urbanstats_quiz_${exported.persistent_id}.json`)
}

export async function importQuizPersona(): Promise<void> {
    const file = await uploadFile('.json')
    if (file === cancelled) {
        return
    }

    try {
        const text = await file.text()
        const persona = quizPersonaSchema.parse(JSON.parse(text))

        const currentHistory = loadQuizHistory()
        let newHistory: QuizHistory

        const conflicts = Object.keys(persona.quiz_history)
            .filter(key =>
                key in currentHistory
                && JSON.stringify(persona.quiz_history[key]) !== JSON.stringify(currentHistory[key]))

        if (conflicts.length > 0) {
            if (confirm(`The following quiz results exist both locally and in the uploaded file, and are different:

${
                conflicts.map(key => `• ${key.startsWith('W') ? 'Retrostat' : 'Juxtastat'} ${key}`).join('\n')
                }

Are you sure you want to merge them? (The lowest score will be used)`)) {
                newHistory = {
                    ...currentHistory, ...persona.quiz_history, ...Object.fromEntries(conflicts.map((key) => {
                        const currentCorrect = currentHistory[key].correct_pattern.filter(value => value).length
                        const importCorrect = persona.quiz_history[key].correct_pattern.filter(value => value).length
                        return [key, importCorrect >= currentCorrect ? currentHistory[key] : persona.quiz_history[key]]
                    })),
                }
            }
            else {
                return
            }
        }
        else {
            // There is not a conflict
            newHistory = { ...currentHistory, ...persona.quiz_history }
        }

        localStorage.setItem('quiz_history', JSON.stringify(newHistory))
        localStorage.setItem('quiz_friends', JSON.stringify(persona.quiz_friends))
        localStorage.setItem('persistent_id', persona.persistent_id)
        localStorage.setItem('secure_id', persona.secure_id)
        // eslint-disable-next-line no-restricted-syntax -- Localstorage is not reactive
        window.location.reload()
    }
    catch (error) {
        alert(`Could not parse file. Error: ${error}`)
    }
}

export function loadQuizHistory(): QuizHistory {
    const history = JSON.parse(localStorage.getItem('quiz_history') ?? '{}') as QuizHistory

    // set 42's correct_pattern's 0th element to true
    if ('42' in history) {
        if ('correct_pattern' in history['42']) {
            if (history['42'].correct_pattern.length > 0) {
                history['42'].correct_pattern[0] = true
            }
        }
    }
    return history
}

export function loadQuizFriends(): QuizFriends {
    return JSON.parse(localStorage.getItem('quiz_friends') ?? '[]') as QuizFriends
}
