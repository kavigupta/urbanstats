import { StatName } from '../page_template/statistic-tree'

import { PageDescriptor } from './navigator'

function shard_bytes(longname: string): [string, string] {
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

export function sharded_name(longname: string): string {
    const sanitized_name = sanitize(longname)
    const [a, b] = shard_bytes(sanitized_name)
    return `${a}/${b}/${sanitized_name}`
}

export function shape_link(longname: string): string {
    return `/shape/${sharded_name(longname)}.gz`
}

export function data_link(longname: string): string {
    return `/data/${sharded_name(longname)}.gz`
}

export function index_link(universe: string, typ: string): string {
    return `/index/${universe}/${sanitize(typ, false)}.gz`
}

export function ordering_link(universe: string, type: string, idx: number): string {
    return `/order/${universe}/${sanitize(type, false)}_${idx}.gz`
}

export function ordering_data_link(universe: string, type: string, idx: number): string {
    return `/order/${universe}/${sanitize(type, false)}_${idx}_data.gz`
}

export function consolidated_shape_link(typ: string): string {
    return `/consolidated/shapes__${sanitize(typ)}.gz`
}

export function consolidated_stats_link(typ: string): string {
    return `/consolidated/stats__${sanitize(typ)}.gz`
}

export function statisticDescriptor(props: {
    universe: string | undefined
    statname: StatName
    article_type: string
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
        article_type: props.article_type,
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
        x = x.replace('/', ' slash ')
    }
    else {
        x = x.replace('/', 'slash')
    }
    x = x.replace('%', '%25')
    return x
}

export function universe_path(universe: string): string {
    return `/icons/flags/${universe}.png`
}
