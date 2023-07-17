
export { article_link, shape_link, data_link };

function article_link(longname) {
    const params = new URLSearchParams()
    params.set('longname', sanitize(longname));
    return "/article.html?" + params.toString();
}

function shape_link(longname) {
    return "/shape/" + sanitize(longname) + '.json'
}

function data_link(longname) {
    return `/data/${sanitize(longname)}.json`
}

function sanitize(longname) {
    let x = longname;
    x = x.replace("/", " slash ");
    x = x.replace("%", "%25");
    return x;
}
