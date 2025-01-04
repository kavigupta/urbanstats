import { saveAs } from 'file-saver'
import { useEffect, useState } from 'react'
import { z } from 'zod'

import { StatPath } from '../page_template/statistic-tree'
import { randomID } from '../utils/random'
import { cancelled, uploadFile } from '../utils/upload'

export type QuizDescriptor = { kind: 'juxtastat', name: number } | { kind: 'retrostat', name: string } | { kind: 'custom', name: string } | { kind: 'infinite', name: string, seed: string, version: number }

export type QuizKind = QuizDescriptor['kind']
// TODO stats for infinite quiz
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
    switch (quizKind) {
        case 'juxtastat': return 'Juxtastat'
        case 'retrostat': return 'Retrostat'
        case 'custom': return 'Juxtastat Custom'
        case 'infinite': return 'Infinite Quiz'
    }
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

// list of [name, id] pairs
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

class StoredProperty<T> {
    private _value: T
    private observers = new Set<() => void>()

    constructor(readonly localStorageKey: string, load: (storageValue: string | null) => T, private readonly store: (value: T) => string) {
        this._value = load(localStorage.getItem(localStorageKey))
    }

    get value(): T {
        return this._value
    }

    set value(newValue: T) {
        this._value = newValue
        localStorage.setItem(this.localStorageKey, this.store(newValue))
        this.observers.forEach((observer) => { observer() })
    }

    /* eslint-disable react-hooks/rules-of-hooks -- Custom hook method */
    use(): T {
        const [, setCounter] = useState(0)
        useEffect(() => {
            const observer = (): void => {
                setCounter(counter => counter + 1)
            }
            this.observers.add(observer)
            return () => {
                this.observers.delete(observer)
            }
        }, [])
        return this.value
    }
    /* eslint-enable react-hooks/rules-of-hooks */
}

export class QuizLocalStorage {
    private constructor() {
        // Private constructor
    }

    static shared = new QuizLocalStorage()

    readonly history = new StoredProperty<QuizHistory>(
        'quiz_history',
        (storedValue) => {
            const history = JSON.parse(storedValue ?? '{}') as QuizHistory

            // set 42's correct_pattern's 0th element to true
            if ('42' in history) {
                if ('correct_pattern' in history['42']) {
                    if (history['42'].correct_pattern.length > 0) {
                        history['42'].correct_pattern[0] = true
                    }
                }
            }
            return history
        },
        value => JSON.stringify(value),
    )

    readonly friends = new StoredProperty<QuizFriends>(
        'quiz_friends',
        (storedValue) => {
            return JSON.parse(storedValue ?? '[]') as QuizFriends
        },
        value => JSON.stringify(value),
    )

    readonly uniquePersistentId = new StoredProperty<string>('persistent_id', () => createAndStoreId('persistent_id'), value => value)

    readonly uniqueSecureId = new StoredProperty<string>('secure_id', () => createAndStoreId('secure_id'), value => value)

    exportQuizPersona(): void {
        const exported: QuizPersona = {
            date_exported: new Date(),
            persistent_id: this.uniquePersistentId.value,
            secure_id: this.uniqueSecureId.value,
            quiz_history: this.history.value,
            quiz_friends: this.friends.value,
        }
        const data = JSON.stringify(exported, null, 2)
        saveAs(new Blob([data], { type: 'application/json' }), `urbanstats_quiz_${exported.persistent_id}.json`)
    }

    async importQuizPersona(): Promise<void> {
        const file = await uploadFile('.json')
        if (file === cancelled) {
            return
        }

        try {
            const text = await file.text()
            const persona = quizPersonaSchema.parse(JSON.parse(text))

            const currentHistory = this.history.value
            let newHistory: QuizHistory

            const conflicts = Object.keys(persona.quiz_history)
                .filter(key =>
                    key in currentHistory
                    && JSON.stringify(persona.quiz_history[key]) !== JSON.stringify(currentHistory[key]))

            if (conflicts.length > 0) {
                if (confirm(`The following quiz results exist both locally and in the uploaded file, and are different:

${conflicts.map(key => `• ${key.startsWith('W') ? 'Retrostat' : 'Juxtastat'} ${key}`).join('\n')}

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

            this.history.value = newHistory
            this.friends.value = persona.quiz_friends
            this.uniquePersistentId.value = persona.persistent_id
            this.uniqueSecureId.value = persona.secure_id
        }
        catch (error) {
            alert(`Could not parse file. Error: ${error}`)
        }
    }

    async addFriend(friendID: string, friendName: string): Promise<undefined | { errorMessage: string, problemDomain: 'friendID' | 'friendName' | 'other' }> {
        const user = this.uniquePersistentId.value
        const secureID = this.uniqueSecureId.value
        if (friendID === '') {
            return { errorMessage: 'Friend ID cannot be empty', problemDomain: 'friendID' }
        }
        if (friendID === user) {
            return { errorMessage: 'Friend ID cannot be your own ID', problemDomain: 'friendID' }
        }
        if (this.friends.value.map(x => x[1]).includes(friendID)) {
            const friendNameDup = this.friends.value.find(x => x[1] === friendID)![0]
            return { errorMessage: `Friend ID ${friendID} already exists as ${friendNameDup}`, problemDomain: 'friendID' }
        }
        if (friendName === '') {
            return { errorMessage: 'Friend name cannot be empty', problemDomain: 'friendName' }
        }
        if (this.friends.value.map(x => x[0]).includes(friendName)) {
            return { errorMessage: 'Friend name already exists', problemDomain: 'friendName' }
        }
        try {
            await fetch(`${endpoint}/juxtastat/friend_request`, {
                method: 'POST',
                body: JSON.stringify({ user, secureID, requestee: friendID }),
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            this.friends.value = [...this.friends.value, [friendName, friendID]]
            return undefined
        }
        catch {
            return { errorMessage: 'Network Error', problemDomain: 'other' }
        }
    }
}

function createAndStoreId(key: string): string {
    // (domain name, id stored in local storage)
    // random 60 bit hex number
    // (15 hex digits)
    if (localStorage.getItem(key) === null) {
        // register
        localStorage.setItem(key, randomID())
    }
    return localStorage.getItem(key)!
}

export async function addFriendFromLink(friendID: string, friendName: string): Promise<void> {
    const result = await QuizLocalStorage.shared.addFriend(friendID, friendName)
    if (result === undefined) {
        alert(`Friend added: ${friendName} !`)
    }
    else {
        if (result.problemDomain === 'friendName') {
            const newFriendName = prompt(`Could not add friend: ${result.errorMessage}\n\nPlease correct the friend name:`, friendName)
            if (newFriendName !== null) {
                await addFriendFromLink(friendID, newFriendName.trim())
            }
        }
        else {
            alert(`Could not add friend: ${result.errorMessage}`)
        }
    }
}

// represents a quiz, which is a collection of questions. Designed so quizzes can be infinite
export interface QuizQuestionsModel {
    questionByIndex: (index: number) => Promise<QuizQuestion | undefined>
    // undefined if the quiz is infinite
    length: number | undefined
    isDone: (correctPattern: boolean[]) => boolean
    uniqueKey: string
}

let numKeys = 0

function uniqueKey(): string {
    numKeys++
    return `quiz-${numKeys}`
}

export function wrapQuestionsModel(questions: QuizQuestion[]): QuizQuestionsModel {
    return {
        questionByIndex: (index: number) => Promise.resolve(questions[index]),
        length: questions.length,
        isDone: (correctPattern: boolean[]) => correctPattern.length === questions.length,
        uniqueKey: uniqueKey(),
    }
}

export function infiniteQuiz(seed: string): QuizQuestionsModel {
    return wrapQuestionsModel([])
    // throw new Error(`Infinite quiz not implemented for seed ${seed}`)
}