import type { StatisticDescriptor } from '../components/statistic-panel'
import type_ordering_idx from '../data/type_ordering_idx'
import { loadProtobuf } from '../load_json'
import type { Universe } from '../universe'

import type { PageDescriptor } from './PageDescriptor'

// Shard indices (gzipped proto, int32): proto stores signed int32; unwrap to unsigned 32-bit and cache.
let shardIndexShapePromise: Promise<number[]> | null = null
let shardIndexDataPromise: Promise<number[]> | null = null

/** Unwrap signed int32 from proto back to unsigned 32-bit hash. */
function unwrapSignedInt32(x: number): number {
    return x >>> 0
}

async function getShardIndexShape(): Promise<number[]> {
    if (shardIndexShapePromise === null) {
        shardIndexShapePromise = loadProtobuf('/shape/shard_index_shape.gz', 'ShardIndex').then(
            idx => idx.startingHashes.map(unwrapSignedInt32),
        )
    }
    return shardIndexShapePromise
}

async function getShardIndexData(): Promise<number[]> {
    if (shardIndexDataPromise === null) {
        shardIndexDataPromise = loadProtobuf('/data/shard_index_data.gz', 'ShardIndex').then(
            idx => idx.startingHashes.map(unwrapSignedInt32),
        )
    }
    return shardIndexDataPromise
}

export const typesInOrder = Object.fromEntries(Object.entries(type_ordering_idx).map(([k, v]) => [v, k]))

/** Full 8-char hex hash for ordering; must match Python shard_bytes_full. */
function shardBytesFull(longname: string): string {
    const bytes = new TextEncoder().encode(longname)
    let hash = 0
    for (const byte of bytes) {
        hash = (hash * 31 + byte) & 0xffffffff
    }
    let s = ''
    for (let i = 0; i < 8; i++) {
        s += (hash & 0xf).toString(16)
        hash = hash >>> 4
    }
    return s
}

/** Hash value used in the shard index (must match Python: int(hex_string, 16) where hex_string is LSB-first). */
function shardBytesFullNum(longname: string): number {
    const bytes = new TextEncoder().encode(longname)
    let hash = 0
    for (const byte of bytes) {
        hash = (hash * 31 + byte) & 0xffffffff
    }
    // Index stores int(hex_string, 16) with hex_string built LSB-first (same as shardBytesFull).
    let s = ''
    for (let i = 0; i < 8; i++) {
        s += (hash & 0xf).toString(16)
        hash = hash >>> 4
    }
    return parseInt(s, 16) >>> 0
}

/** First 2 + 1 hex chars; used only for symlinks folder names. */
function shardBytes(longname: string): [string, string] {
    const full = shardBytesFull(longname)
    return [full.slice(0, 2), full.slice(2, 3)]
}

/** Binary search: largest i such that index[i] <= hash (unsigned). Index is sorted. */
function findShardIndex(hash: number, index: number[]): number {
    if (index.length === 0) return 0
    const h = hash >>> 0
    let lo = 0
    let hi = index.length - 1
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (index[mid] <= h) {
            lo = mid
        }
        else {
            hi = mid - 1
        }
    }
    return index[lo] <= h ? lo : 0
}

/** Nested path for shard index: A/B (second-last and last hex digit). 256 -> 0/0. Must match Python shard_subfolder. */
function shardPathPrefix(shardIdx: number): string {
    const s = shardIdx.toString(16)
    const a = s.length >= 2 ? s[s.length - 2] : '0'
    const b = s[s.length - 1]
    return `${a}/${b}`
}

export function shardedFolderName(longname: string): string {
    const sanitizedName = sanitize(longname)
    const [a, b] = shardBytes(sanitizedName)
    return `${a}/${b}`
}

export function shardedName(longname: string): string {
    const sanitizedName = sanitize(longname)
    return `${shardedFolderName(longname)}/${sanitizedName}`
}

export async function shapeLink(longname: string): Promise<string> {
    const index = await getShardIndexShape()
    const hash = shardBytesFullNum(sanitize(longname))
    const shardIdx = findShardIndex(hash, index)
    return `/shape/${shardPathPrefix(shardIdx)}/shard_${shardIdx}.gz`
}

export async function dataLink(longname: string): Promise<string> {
    const index = await getShardIndexData()
    const hash = shardBytesFullNum(sanitize(longname))
    console.log('Hash for', longname, 'is', hash.toString(16))
    const shardIdx = findShardIndex(hash, index)
    return `/data/${shardPathPrefix(shardIdx)}/shard_${shardIdx}.gz`
}

export function indexLink(universe: string, typ: string): string {
    return `/index/${universe}/${encodeURIComponent(sanitize(typ, false))}.gz`
}

export function orderingLink(type: string, idx: number): string {
    return `/order/${encodeURIComponent(sanitize(type, false))}_${idx}.gz`
}

export function orderingDataLink(type: string, idx: number): string {
    return `/order/${encodeURIComponent(sanitize(type, false))}_${idx}_data.gz`
}

export function searchIconLink(typeIdx: number): string {
    return `/icons/search_icons/${typesInOrder[typeIdx]}.png`
}

export function consolidatedShapeLink(typ: string): string {
    return `/consolidated/shapes__${encodeURIComponent(sanitize(typ))}.gz`
}

export function centroidsPath(universe: string, typ: string): string {
    return `/centroids/${encodeURIComponent(universe)}_${encodeURIComponent(sanitize(typ))}.gz`
}

export function statisticDescriptor(props: {
    universe: Universe | undefined
    statDesc: StatisticDescriptor
    articleType: string
    start: number
    amount: number | 'All'
    order: 'ascending' | 'descending'
    highlight?: string
    edit?: boolean
    sortColumn: number
}): PageDescriptor & { kind: 'statistic' } {
    let start = props.start
    if (props.amount !== 'All') {
        start = start - 1
        start = start - (start % props.amount)
        start = start + 1
    }
    return {
        kind: 'statistic',
        ...(props.statDesc.type === 'simple-statistic' ? { statname: props.statDesc.statname } : { uss: props.statDesc.uss }),
        article_type: props.articleType,
        start,
        amount: props.amount,
        order: props.order,
        highlight: props.highlight,
        universe: props.universe,
        edit: props.edit,
        sort_column: props.sortColumn,
    }
}

export function sanitize(longname: string, spaces_around_slash = true): string {
    let x = longname
    if (spaces_around_slash) {
        x = x.replaceAll('/', ' slash ')
    }
    else {
        x = x.replaceAll('/', 'slash')
    }
    x = x.replaceAll('%', '%25')
    return x
}

export function universePath(universe: string): string {
    return `/icons/flags/${encodeURIComponent(universe)}.png`
}
