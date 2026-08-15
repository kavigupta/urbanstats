/*
 * Everything an embed needs, read straight off the site's static data files.
 *
 * Articles and shapes are sharded by a hash of the longname, so a lookup is two fetches each: the
 * shard index, then the shard. All four are small and immutable, so once the edge has them a
 * render costs no origin traffic at all.
 *
 * The hashing and shard layout must stay in step with react/src/navigation/links.ts.
 */
import statNames from '../../react/src/data/statistic_name_list.ts'
import { ShardIndex, ConsolidatedArticles, ConsolidatedShapes } from '../../react/src/utils/protos.js'

const sanitize = longname => longname.replaceAll('/', ' slash ')

function shardBytesFullNum(sanitized) {
    const bytes = new TextEncoder().encode(sanitized)
    let hash = 0
    for (const byte of bytes) {
        hash = (hash * 31 + byte) & 0xffffffff
    }
    let s = ''
    for (let i = 0; i < 8; i++) {
        s += (hash & 0xf).toString(16)
        hash = hash >>> 4
    }
    return parseInt(s, 16) >>> 0
}

function findShardIndex(hash, index) {
    if (index.length === 0) {
        return 0
    }
    const h = hash >>> 0
    let lo = 0
    let hi = index.length - 1
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if ((index[mid] >>> 0) <= h) {
            lo = mid
        }
        else {
            hi = mid - 1
        }
    }
    return (index[lo] >>> 0) <= h ? lo : 0
}

function shardPathPrefix(shardIdx) {
    const s = shardIdx.toString(16)
    return `${s.length >= 2 ? s[s.length - 2] : '0'}/${s[s.length - 1]}`
}

async function gunzip(buffer) {
    const stream = new Response(buffer).body.pipeThrough(new DecompressionStream('gzip'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function fetchProto(origin, path, type) {
    const response = await fetch(`${origin}${path}`, { cf: { cacheEverything: true, cacheTtl: 86400 } })
    if (!response.ok) {
        throw new Error(`${path} -> ${response.status}`)
    }
    return type.decode(await gunzip(await response.arrayBuffer()))
}

async function fetchShard(origin, kind, sanitized, type) {
    const indexName = kind === 'data' ? 'shard_index_data' : 'shard_index_shape'
    const index = new Int32Array((await fetchProto(origin, `/${kind}/${indexName}.gz`, ShardIndex)).startingHashes)
    const shardIdx = findShardIndex(shardBytesFullNum(sanitized), index)
    return fetchProto(origin, `/${kind}/${shardPathPrefix(shardIdx)}/shard_${shardIdx}.gz`, type)
}

function unpackBytes(bytes) {
    const result = []
    for (let i = 0; i < bytes.length; i++) {
        for (let j = 0; j < 8; j++) {
            if (bytes[i] & (1 << j)) {
                result.push(i * 8 + j)
            }
        }
    }
    return result
}

/** The stats the embed shows, in the order it shows them. */
const shown = ['Population', 'PW Density (r=1km)', 'AW Density', 'Area', 'Compactness']

export async function loadArticle(origin, longname, universe) {
    const sanitized = sanitize(longname)
    const shard = await fetchShard(origin, 'data', sanitized, ConsolidatedArticles)
    const index = shard.longnames.indexOf(sanitized)
    if (index < 0) {
        return undefined
    }
    const article = shard.articles[index]
    const statIndices = unpackBytes(article.statisticIndicesPacked)
    // Falls back to the first universe, which is the broadest one the article belongs to.
    const universeIdx = Math.max(0, article.universes.indexOf(universe ?? article.universes[0]))

    const stats = shown.flatMap((name) => {
        const row = statIndices.indexOf(statNames.indexOf(name))
        if (row < 0) {
            return []
        }
        const { statval, ordinalByUniverse, percentileByPopulationByUniverse } = article.rows[row]
        return [{
            name,
            value: statval,
            ordinal: ordinalByUniverse[universeIdx],
            percentile: percentileByPopulationByUniverse[universeIdx],
        }]
    })

    return { shortname: article.shortname, longname, articleType: article.articleType, stats }
}

export async function loadShape(origin, longname) {
    const sanitized = sanitize(longname)
    const shard = await fetchShard(origin, 'shape', sanitized, ConsolidatedShapes)
    const index = shard.longnames.indexOf(sanitized)
    if (index < 0) {
        return undefined
    }
    const feature = shard.shapes[index]
    const polygons = feature.polygon ? [feature.polygon] : (feature.multipolygon?.polygons ?? [])
    return polygons.flatMap(polygon => polygon.rings.map(ring => ring.coords))
}
