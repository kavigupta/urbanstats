/* Replaces modules the router needs only for rendering, which would bundle the whole app. See [alias] in wrangler.toml. */

/** Only called to lay out comparison maps, which the Worker does not draw. */
export function partitionLongnames(): number[][] {
    return []
}

export default undefined
