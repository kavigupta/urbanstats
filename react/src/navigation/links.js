
export { article_link, shape_link, data_link, ordering_link };

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

function ordering_link(statname, type) {
    return `/order/${sanitize(statname, false)}__${sanitize(type, false)}.gz`
}

function sanitize(longname, spaces_around_slash=true) {
    let x = longname;
    if (spaces_around_slash) {
        x = x.replace("/", " slash ");
    } else {
        x = x.replace("/", "slash");
    }
    x = x.replace("%", "%25");
    return x;
}
