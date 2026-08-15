/*
 * Stands in for every module the router pulls in only to render a page with.
 *
 * The Worker never renders one -- it wants the loaded data, not the panel -- and letting those
 * imports through would drag the whole app, maps included, into the bundle. Aliased in
 * wrangler.toml; see the [alias] list there for what it replaces.
 */

/** Only called to lay out comparison maps, which the Worker does not draw. */
export function partitionLongnames(): number[][] {
    return []
}

export default undefined
