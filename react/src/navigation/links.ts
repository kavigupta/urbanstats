import type { StatisticDescriptor } from '../components/statistic-panel'
import shardIndexData from '../data/shard_index_data.json'
import shardIndexShape from '../data/shard_index_shape.json'
import type_ordering_idx from '../data/type_ordering_idx'
import type { Universe } from '../universe'

import type { PageDescriptor } from './PageDescriptor'

// Size-based sharding: index is sorted array of hash strings that start each shard.
function asStringArray(x: unknown): string[] {
    return Array.isArray(x) && x.every((e): e is string => typeof e === 'string') ? x : []
}
const shardIndexShapeArr: string[] = asStringArray(shardIndexShape)
const shardIndexDataArr: string[] = asStringArray(shardIndexData)

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

/** First 2 + 1 hex chars; used only for symlinks folder names. */
function shardBytes(longname: string): [string, string] {
    const full = shardBytesFull(longname)
    return [full.slice(0, 2), full.slice(2, 3)]
}

/** Binary search: largest i such that index[i] <= hash. Index is sorted. */
function findShardIndex(hash: string, index: string[]): number {
    if (index.length === 0) return 0
    let lo = 0
    let hi = index.length - 1
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (index[mid] <= hash) {
            lo = mid
        }
        else {
            hi = mid - 1
        }
    }
    return index[lo] <= hash ? lo : 0
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

export function shapeLink(longname: string): string {
    const hash = shardBytesFull(sanitize(longname))
    const shardIdx = findShardIndex(hash, shardIndexShapeArr)
    return `/shape/${shardPathPrefix(shardIdx)}/shard_${shardIdx}.gz`
}

export function dataLink(longname: string): string {
    const hash = shardBytesFull(sanitize(longname))
    const shardIdx = findShardIndex(hash, shardIndexDataArr)
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
