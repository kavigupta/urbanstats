export function article_link(universe: string, longname: string) {
    const params = new URLSearchParams()
    params.set('longname', sanitize(longname));
    add_universe_to_params(universe, params);
    return "/article.html?" + params.toString();
}

export function shape_link(longname: string) {
    return "/shape/" + sanitize(longname) + '.gz'
}

export function data_link(longname: string) {
    return `/data/${sanitize(longname)}.gz`
}

export function index_link(universe: string, typ: string) {
    return `/index/${universe}_${sanitize(typ, false)}.gz`
}

export function ordering_link(universe: string, type: string, idx: number) {
    return `/order/${universe}__${sanitize(type, false)}_${idx}.gz`
}

export function ordering_data_link(universe: string, type: string, idx: number) {
    return `/order/${universe}__${sanitize(type, false)}_${idx}_data.gz`
}

export function explanation_page_link(explanation: string) {
    return `/data-credit.html#explanation_${sanitize(explanation)}`
}

export function consolidated_shape_link(typ: string) {
    return `/consolidated/shapes__${sanitize(typ)}.gz`
}

export function consolidated_stats_link(typ: string) {
    return `/consolidated/stats__${sanitize(typ)}.gz`
}

export function comparison_link(universe: string, names: string[]) {
    const params = new URLSearchParams()
    params.set('longnames', JSON.stringify(names.map(name => sanitize(name))));
    add_universe_to_params(universe, params);
    return "/comparison.html?" + params.toString();
}

export function statistic_link(universe: string | undefined, statname: string, article_type: string, start: number, amount: number | "All", order: string, highlight: string) {
    // make start % amount == 0
    if (amount != "All") {
        start = start - 1;
        start = start - (start % amount);
        start = start + 1;
    }
    const params = new URLSearchParams()
    params.set('statname', statname);
    params.set('article_type', article_type);
    if (start !== undefined) {
        params.set('start', start.toString());
    }
    if (amount !== undefined) {
        params.set('amount', `${amount}`)
    }
    if (order !== undefined && order !== null) {
        params.set('order', order);
    }
    if (highlight !== undefined) {
        params.set('highlight', highlight);
    }
    add_universe_to_params(universe, params);
    return "/statistic.html?" + params.toString();
}

export function sanitize(longname: string, spaces_around_slash = true) {
    let x = longname;
    if (spaces_around_slash) {
        x = x.replace("/", " slash ");
    } else {
        x = x.replace("/", "slash");
    }
    x = x.replace("%", "%25");
    return x;
}

export function universe_path(universe: string) {
    return `/icons/flags/${universe}.png`
}

export function add_universe_to_params(universe: string | undefined, params: URLSearchParams) {
    if (universe !== undefined)
        params.set("universe", universe)
}
