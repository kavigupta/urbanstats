export {
    sanitize,
    index_link,
    article_link, shape_link, data_link, ordering_link, ordering_data_link,
    explanation_page_link,
    consolidated_shape_link, consolidated_stats_link, comparison_link,
    statistic_link,
    universe_path
};

function article_link(universe, longname) {
    const params = new URLSearchParams()
    params.set('longname', sanitize(longname));
    add_universe_to_params(universe, params);
    return "/article.html?" + params.toString();
}

function shape_link(longname) {
    return "/shape/" + sanitize(longname) + '.gz'
}

function data_link(longname) {
    return `/data/${sanitize(longname)}.gz`
}

function index_link(universe, typ) {
    return `/index/${universe}_${sanitize(typ, false)}.gz`
}

function ordering_link(universe, type, idx) {
    return `/order/${universe}__${sanitize(type, false)}_${idx}.gz`
}

function ordering_data_link(universe, type, idx) {
    return `/order/${universe}__${sanitize(type, false)}_${idx}_data.gz`
}

function explanation_page_link(explanation) {
    return `/data-credit.html#explanation_${sanitize(explanation)}`
}

function consolidated_shape_link(typ) {
    return `/consolidated/shapes__${sanitize(typ)}.gz`
}

function consolidated_stats_link(typ) {
    return `/consolidated/stats__${sanitize(typ)}.gz`
}

function comparison_link(universe, names) {
    const params = new URLSearchParams()
    params.set('longnames', JSON.stringify(names.map(sanitize)));
    add_universe_to_params(universe, params);
    return "/comparison.html?" + params.toString();
}

function statistic_link(universe, statname, article_type, start, amount, order, highlight) {
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
        params.set('start', start);
    }
    if (amount !== undefined) {
        params.set('amount', amount);
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

function sanitize(longname, spaces_around_slash = true) {
    let x = longname;
    if (spaces_around_slash) {
        x = x.replace("/", " slash ");
    } else {
        x = x.replace("/", "slash");
    }
    x = x.replace("%", "%25");
    return x;
}

function universe_path(universe) {
    return `/icons/flags/${universe}.png`
}

function add_universe_to_params(universe, params) {
    params.set("universe", universe)
}
