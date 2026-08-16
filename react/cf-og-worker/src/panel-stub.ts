/*
 * Stands in for every module the router pulls in only to render a page with, which would otherwise
 * drag the whole app into the bundle. See the [alias] list in wrangler.toml for what it replaces.
 */

/** Only called to lay out comparison maps, which the Worker does not draw. */
export function partitionLongnames(): number[][] {
    return []
}

export default undefined
