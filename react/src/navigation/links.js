
export {
    sanitize,
    article_link, shape_link, data_link, ordering_link, explanation_page_link,
    consolidated_shape_link, consolidated_stats_link
};

function article_link(longname) {
    const params = new URLSearchParams()
    params.set('longname', sanitize(longname));
    return "/article.html?" + params.toString();
}

function shape_link(longname) {
    return "/shape/" + sanitize(longname) + '.gz'
}

function data_link(longname) {
    return `/data/${sanitize(longname)}.gz`
}

function ordering_link(statpath, type) {
    return `/order/${sanitize(statpath, false)}__${sanitize(type, false)}.gz`
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
