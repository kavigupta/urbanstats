import { saveAs } from 'file-saver'
import * as idb from 'idb'

type Destination = 'console' | 'buffer'

const enableDebugLogging = {
    search: ['buffer'],
    searchPerformance: ['buffer'],
    waitForLoading: ['buffer'],
    undoRedo: ['buffer'],
    mapExport: ['buffer'],
} satisfies Record<string, Destination[]>

type Key = keyof typeof enableDebugLogging

export const debugBufferEnabled = Object.values<Destination[]>(enableDebugLogging).some(destinations => destinations.includes('buffer'))

const maxBufferEntries = 100_000
const tabId = Math.random().toString(36).slice(2, 8)

interface Entry { time: number, tab: string, categories: string, text: string }

interface DebugLogDB extends idb.DBSchema {
    entries: { key: number, value: Entry }
}

let dbPromise: Promise<idb.IDBPDatabase<DebugLogDB>> | undefined
function getDb(): Promise<idb.IDBPDatabase<DebugLogDB>> {
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

export async function downloadDebugBuffer(): Promise<void> {
    const entries = await (await getDb()).getAll('entries')
    const text = entries.map(entry => `${new Date(entry.time).toISOString()} ${entry.tab} [${entry.categories}] ${entry.text}\n`).join('')
    saveAs(new Blob([text], { type: 'text/plain' }), 'urbanstats-debug-log.txt')
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
            const entry = { time: Date.now(), tab: tabId, categories: label, text: args.map(formatArg).join(' ') }
            void getDb().then(db => insert(db, entry))
        }
    }
}
