import type { StatisticDescriptor } from '../components/statistic-panel'
import type_ordering_idx from '../data/type_ordering_idx'
import { loadProtobuf } from '../load_json'
import type { Universe } from '../universe'
import { sanitize } from '../utils/paths'
import { shardBytesFullNum } from '../utils/shardHash'

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

export async function shapeLink(longname: string): Promise<string> {
    const index = await getShardIndexShape()
    const hash = shardBytesFullNum(sanitize(longname, true))
    const shardIdx = findShardIndex(hash, index)
    return `/shape/${shardPathPrefix(shardIdx)}/shard_${shardIdx}.gz`
}

export async function dataLink(longname: string): Promise<string> {
    const index = await getShardIndexData()
    const hash = shardBytesFullNum(sanitize(longname, true))
    const shardIdx = findShardIndex(hash, index)
    return `/data/${shardPathPrefix(shardIdx)}/shard_${shardIdx}.gz`
}

export function indexLink(universe: string, typ: string): string {
    return `/index/${universe}/${encodeURIComponent(typ)}.gz`
}

export function orderingLink(type: string, idx: number): string {
    return `/order/${encodeURIComponent(type)}_${idx}.gz`
}

export function orderingDataLink(type: string, idx: number): string {
    return `/order/${encodeURIComponent(type)}_${idx}_data.gz`
}

export function consolidatedShapeLink(typ: string): string {
    return `/consolidated/shapes__${encodeURIComponent(sanitize(typ))}.gz`
}

export function searchIconLink(typeIdx: number): string {
    return `/icons/search_icons/${typesInOrder[typeIdx]}.png`
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

export function universePath(universe: string): string {
    return `/icons/flags/${encodeURIComponent(universe)}.png`
}
