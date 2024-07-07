

export function get_universe(default_universe) {
    return new URLSearchParams(window.location.search).get("universe") || default_universe
}

export function set_universe(universe) {
    const params = new URLSearchParams(window.location.search);
    params.set("universe", universe);
    window.location.search = params.toString();
}

export function remove_universe_if_not_in(universes) {
    if (!universes.includes(get_universe(undefined))) {
        // clear universe without actually reloading the page
        const params = new URLSearchParams(window.location.search);
        params.delete("universe");
        window.history.replaceState({}, "", window.location.pathname + "?" + params.toString());
    }
}

export function remove_universe_if_default(default_universe) {
    if (get_universe(undefined) === default_universe) {
        // clear universe without actually reloading the page
        const params = new URLSearchParams(window.location.search);
        params.delete("universe");
        window.history.replaceState({}, "", window.location.pathname + "?" + params.toString());
    }
}

export function default_article_universe(longname) {
    console.log(longname);
    // if longname contains USA, then default to USA
    if (longname.includes("USA")) {
        console.log("USA!!")
        return "USA";
    }
    return "world";
}

export function default_comparison_universe(longnames) {
    // if all longnames are the same universe, default to that universe
    const universes = longnames.map(x => default_article_universe(x));
    if (universes.every(x => x === universes[0])) {
        return universes[0];
    }
    return "world";
}

export function universe_is_american(universe) {
    // if universe ends with USA, then it's American
    return universe.includes("USA");
}