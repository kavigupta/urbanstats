import {
    loadArticleFromConsolidatedShard,
    loadFeatureFromConsolidatedShard,
} from '../load_json'
import { dataLink, shapeLink } from '../navigation/links'

import { Article, Feature } from './protos'

/** Load article by longname. Symlinks are resolved in sharded data; no separate symlink fetch. */
export async function loadArticleFromPossibleSymlink(longname: string): Promise<Article> {
    const article = await loadArticleFromConsolidatedShard(await dataLink(longname), longname)
    if (article === undefined) {
        throw new Error(`Could not find article ${longname}`)
    }
    return article
}

/** Load shape/feature by longname. Symlinks are resolved in sharded data; no separate symlink fetch. */
export async function loadFeatureFromPossibleSymlink(longname: string): Promise<Feature> {
    const feature = await loadFeatureFromConsolidatedShard(await shapeLink(longname), longname)
    if (feature === undefined) {
        throw new Error(`Could not find feature ${longname}`)
    }
    return feature
}

export function loadArticlesFromPossibleSymlink(longnames: string[]): Promise<Article[]> {
    return Promise.all(longnames.map(loadArticleFromPossibleSymlink))
}
