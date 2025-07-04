export type LocalStorageKey = 'enable_auth_features'
    | 'testIterationId'
    | 'settings'
    | 'quizAuthenticationState'
    | 'codeVerifier'
    | 'debug_quiz_transition'
    | 'quiz_history'
    | 'quiz_friends'
    | 'persistent_id'
    | 'secure_id'
    | 'dismiss_auth_nag'
    | 'testHostname'

interface TypeSafeLocalStorage extends Storage {
    getItem: (key: LocalStorageKey) => string | null
    setItem: (key: LocalStorageKey, value: string) => void
    removeItem: (key: LocalStorageKey) => void
    clear: never
}

export const safeStorage = localStorage as TypeSafeLocalStorage
