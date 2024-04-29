

export function get_universe() {
    return new URLSearchParams(window.location.search).get("universe") || "world"
}

export function set_universe(universe) {
    const params = new URLSearchParams(window.location.search);
    params.set("universe", universe);
    window.location.search = params.toString();
}

export function add_universe_to_params(params) {
    if (get_universe() !== "world") {
        params.set("universe", get_universe())
    }
}

export function remove_universe_if_not_in(universes) {
    if (!universes.includes(get_universe())) {
        // clear universe without actually reloading the page
        const params = new URLSearchParams(window.location.search);
        params.delete("universe");
        window.history.replaceState({}, "", window.location.pathname + "?" + params.toString());
    }
}
