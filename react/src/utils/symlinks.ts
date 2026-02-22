import {
    loadArticleFromConsolidatedShard,
    loadFeatureFromConsolidatedShard,
} from '../load_json'
import { dataLink, shapeLink } from '../navigation/links'

import { Article, Feature } from './protos'

/** Load article by longname. Symlinks are resolved in sharded data; no separate symlink fetch. */
export async function loadArticleFromPossibleSymlink(longname: string): Promise<Article> {
    const dlink = await dataLink(longname)
    const article = await loadArticleFromConsolidatedShard(dlink, longname)
    if (article === undefined) {
        throw new Error(`Could not find article ${longname}`)
    }
    return article
}

/** Load shape/feature by longname. Symlinks are resolved in sharded data; no separate symlink fetch. */
export async function loadFeatureFromPossibleSymlink(longname: string): Promise<Feature> {
    const link = await shapeLink(longname)
    console.log('Shape link for', longname, 'is', link)
    const feature = await loadFeatureFromConsolidatedShard(link, longname)
    if (feature === undefined) {
        throw new Error(`Could not find feature ${longname} in shard ${link}`)
    }
    return feature
}

export function loadArticlesFromPossibleSymlink(longnames: string[]): Promise<Article[]> {
    return Promise.all(longnames.map(loadArticleFromPossibleSymlink))
}
