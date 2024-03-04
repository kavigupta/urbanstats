export function article_link(longname: string) {
    const params = new URLSearchParams()
    params.set('longname', sanitize(longname));
    return "/article.html?" + params.toString();
}

export function shape_link(longname: string) {
    return "/shape/" + sanitize(longname) + '.gz'
}

export function data_link(longname: string) {
    return `/data/${sanitize(longname)}.gz`
}

export function ordering_link(statpath: string, type: string) {
    return `/order/${sanitize(statpath, false)}__${sanitize(type, false)}.gz`
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

export function comparison_link(names: string[]) {
    const params = new URLSearchParams()
    params.set('longnames', JSON.stringify(names.map(name => sanitize(name))));
    return "/comparison.html?" + params.toString();
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
