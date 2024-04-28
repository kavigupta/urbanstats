

export function get_universe() {
    return new URLSearchParams(window.location.search).get("universe") || "world"
}

export function set_universe(universe) {
    const params = new URLSearchParams(window.location.search);
    params.set("universe", universe);
    window.location.search = params.toString();
}
