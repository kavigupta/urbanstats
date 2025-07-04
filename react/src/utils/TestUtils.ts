import * as idb from 'idb'

/**
 * Indicates whether we're e2e testing.
 *
 * Use sparingly! Functionality under testing should diverge minimally.
 *
 * Uses the fact that we only clear localstorage during testing, not idb
 */

interface TestKv {
    testIterationId?: string
    otherKey?: never
}

export class TestUtils {
    isTesting = false

    private constructor() {
        void (async () => {
            this.isTesting = (await this.get('testIterationId')) !== undefined
        })
    }

    static shared = new TestUtils()

    db = idb.openDB('Testing', 1, {
        upgrade(database) {
            database.createObjectStore('kv')
        },
    })

    async get<K extends keyof TestKv>(key: K): Promise<TestKv[K]> {
        return (await this.db).get('kv', key) as Promise<TestKv[K]>
    }

    async set<K extends keyof TestKv>(key: K, value: TestKv[K]): Promise<void> {
        if (key === 'testIterationId') {
            this.isTesting = value !== undefined
        }
        await (await this.db).put('kv', value, key)
    }

    testSyncing = false
}

export interface TestWindow {
    testUtils: TestUtils
}

(window as unknown as TestWindow).testUtils = TestUtils.shared
