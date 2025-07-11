import createClient from 'openapi-fetch'

import { QuizModel } from '../quiz/quiz'

import { TestUtils } from './TestUtils'
import type { paths } from './urbanstats-persistent-data' // generated by openapi-typescript

export const persistentClient = createClient<paths>({ baseUrl: TestUtils.shared.isTesting ? 'http://localhost:54579' : 'https://persistent.urbanstats.org', async fetch(input) {
    const response = await globalThis.fetch(input)
    if (response.status === 401) {
        QuizModel.shared.authenticationError.value = true
    }
    return response
} })
