import type_ordering_idx from '../data/type_ordering_idx'
import { StatName } from '../page_template/statistic-tree'

import { PageDescriptor } from './PageDescriptor'

const typesInOrder = Object.fromEntries(Object.entries(type_ordering_idx).map(([k, v]) => [v, k]))

function shardBytes(longname: string): [string, string] {
    // as bytes, in utf-8
    const bytes = new TextEncoder().encode(longname)
    const hash = new Uint32Array([0])
    for (const byte of bytes) {
        hash[0] = (hash[0] * 31 + byte) & 0xffffffff
    }
    // last 4 hex digits
    let string = ''
    for (let i = 0; i < 4; i++) {
        string += (hash[0] & 0xf).toString(16)
        hash[0] = hash[0] >> 4
    }
    // get first two and last two
    return [
        string.slice(0, 2),
        string.slice(2, 3),
    ]
}

function shardedFolderName(longname: string): string {
    const sanitizedName = sanitize(longname)
    const [a, b] = shardBytes(sanitizedName)
    return `${a}/${b}`
}

export function shardedName(longname: string): string {
    const sanitizedName = sanitize(longname)
    return `${shardedFolderName(longname)}/${sanitizedName}`
}

export function shapeLink(longname: string): string {
    return `/shape/${encodeURIComponent(shardedName(longname))}.gz`
}

export function dataLink(longname: string): string {
    return `/data/${encodeURIComponent(shardedName(longname))}.gz`
}

export function symlinksLink(longname: string): string {
    return `/data/${shardedFolderName(longname)}.symlinks.gz`
}

export function indexLink(universe: string, typ: string): string {
    return `/index/${universe}/${encodeURIComponent(sanitize(typ, false))}.gz`
}

export function orderingLink(universe: string, type: string, idx: number): string {
    return `/order/${universe}/${encodeURIComponent(sanitize(type, false))}_${idx}.gz`
}

export function orderingDataLink(universe: string, type: string, idx: number): string {
    return `/order/${universe}/${encodeURIComponent(sanitize(type, false))}_${idx}_data.gz`
}

export function consolidatedShapeLink(typ: string): string {
    return `/consolidated/shapes__${encodeURIComponent(sanitize(typ))}.gz`
}

export function consolidatedStatsLink(typ: string): string {
    return `/consolidated/stats__${encodeURIComponent(sanitize(typ))}.gz`
}

export function searchIconLink(typeIdx: number): string {
    return `/icons/search_icons/${typesInOrder[typeIdx]}.png`
}

export function centroidsPath(universe: string, typ: string): string {
    return `/centroids/${encodeURIComponent(universe)}_${encodeURIComponent(sanitize(typ))}.gz`
}

export function statisticDescriptor(props: {
    universe: string | undefined
    statname: StatName
    articleType: string
    start: number
    amount: number | 'All'
    order: 'ascending' | 'descending'
    highlight?: string
}): PageDescriptor & { kind: 'statistic' } {
    let start = props.start
    // make start % amount == 0
    if (props.amount !== 'All') {
        start = start - 1
        start = start - (start % props.amount)
        start = start + 1
    }
    return {
        kind: 'statistic',
        statname: props.statname,
        article_type: props.articleType,
        start,
        amount: props.amount,
        order: props.order,
        highlight: props.highlight,
        universe: props.universe,
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
