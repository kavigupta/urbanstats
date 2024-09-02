export function article_link(universe: string | undefined, longname: string): string {
    const params = new URLSearchParams()
    params.set('longname', sanitize(longname))
    add_universe_to_params(universe, params)
    return `/article.html?${params.toString()}`
}

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

export function explanation_page_link(explanation: string): string {
    return `/data-credit.html#explanation_${sanitize(explanation)}`
}

export function consolidated_shape_link(typ: string): string {
    return `/consolidated/shapes__${sanitize(typ)}.gz`
}

export function consolidated_stats_link(typ: string): string {
    return `/consolidated/stats__${sanitize(typ)}.gz`
}

export function comparison_link(universe: string, names: string[]): string {
    const params = new URLSearchParams()
    params.set('longnames', JSON.stringify(names.map(name => sanitize(name))))
    add_universe_to_params(universe, params)
    return `/comparison.html?${params.toString()}`
}

export function statistic_link(universe: string | undefined, statname: string, article_type: string, start: number, amount: number | 'All', order: string | undefined, highlight: string | undefined): string {
    // make start % amount == 0
    if (amount !== 'All') {
        start = start - 1
        start = start - (start % amount)
        start = start + 1
    }
    const params = new URLSearchParams()
    params.set('statname', statname)
    params.set('article_type', article_type)
    params.set('start', start.toString())
    params.set('amount', `${amount}`)
    if (order !== undefined && order !== 'descending') {
        params.set('order', order)
    }
    if (highlight !== undefined) {
        params.set('highlight', highlight)
    }
    add_universe_to_params(universe, params)
    return `/statistic.html?${params.toString()}`
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

export function add_universe_to_params(universe: string | undefined, params: URLSearchParams): void {
    if (universe !== undefined)
        params.set('universe', universe)
}
