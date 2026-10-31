import * as idb from 'idb'

type Destination = 'console' | 'buffer'

const enableDebugLogging = {
    search: [],
    searchPerformance: ['buffer'],
    waitForLoading: ['buffer'],
    undoRedo: ['buffer'],
    mapExport: ['buffer'],
} satisfies Record<string, Destination[]>

type Key = keyof typeof enableDebugLogging

export const debugBufferEnabled = Object.values<Destination[]>(enableDebugLogging).some(destinations => destinations.includes('buffer'))

const maxBufferEntries = 100_000
// Workers are named after their page's id so their entries can be correlated
export const debugTabId = typeof window === 'undefined' && typeof self !== 'undefined' ? self.name : Math.random().toString(36).slice(2, 8)

interface Entry { time: number, tab: string, categories: string, text: string }

interface DebugLogDB extends idb.DBSchema {
    entries: { key: number, value: Entry }
}

let dbPromise: Promise<idb.IDBPDatabase<DebugLogDB>> | undefined
// async so that a synchronous throw from indexedDB.open becomes a rejection
async function getDb(): Promise<idb.IDBPDatabase<DebugLogDB>> {
    dbPromise ??= idb.openDB<DebugLogDB>('DebugLog', 1, {
        upgrade(database) {
            database.createObjectStore('entries', { autoIncrement: true })
        },
    })
    return dbPromise
}

async function insert(db: idb.IDBPDatabase<DebugLogDB>, entry: Entry): Promise<void> {
    const tx = db.transaction('entries', 'readwrite', { durability: 'relaxed' })
    const key = await tx.store.add(entry)
    await tx.store.delete(IDBKeyRange.upperBound(key - maxBufferEntries))
}

function formatArg(arg: unknown): string {
    if (typeof arg === 'string') {
        return arg
    }
    if (arg instanceof Error) {
        return arg.stack ?? String(arg)
    }
    try {
        return JSON.stringify(arg)
    }
    catch {
        return String(arg)
    }
}

export async function debugBufferText(): Promise<string> {
    const entries = await (await getDb()).getAll('entries')
    return `User agent: ${navigator.userAgent}\n` + entries.map(entry => `${new Date(entry.time).toISOString()} ${entry.tab} [${entry.categories}] ${entry.text.replaceAll('\n', '\\n')}\n`).join('')
}

export function makeDebugLogger(...categories: [Key, ...Key[]]): (...args: unknown[]) => void {
    const destinations = categories.flatMap((category): Destination[] => enableDebugLogging[category])
    const toConsole = destinations.includes('console')
    const toBuffer = destinations.includes('buffer')
    if (!toConsole && !toBuffer) {
        return () => undefined
    }
    const label = categories.join(',')
    return (...args) => {
        if (toConsole) {
            // eslint-disable-next-line no-console -- Debug logging
            console.log(`[${label}]`, ...args)
        }
        if (toBuffer) {
            const entry = { time: Date.now(), tab: debugTabId, categories: label, text: args.map(formatArg).join(' ') }
            // Debug logging must not break the app if IndexedDB is unavailable
            getDb().then(db => insert(db, entry)).catch(() => undefined)
        }
    }
}
