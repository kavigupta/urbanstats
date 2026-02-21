import {
    loadArticleFromConsolidatedShard,
    loadFeatureFromConsolidatedShard,
    loadProtobuf,
} from '../load_json'
import { dataLink, shapeLink, symlinksLink } from '../navigation/links'

import { Article, Feature } from './protos'

async function loadWithSymlink<T>(longname: string, doLoad: (link: string) => Promise<T | undefined>): Promise<T | undefined> {
    const symlinks = await loadProtobuf(symlinksLink(longname), 'Symlinks')
    const idx = symlinks.linkName.indexOf(longname)
    if (idx === -1) {
        return undefined
    }
    return await doLoad(symlinks.targetName[idx])
}

async function loadProtobufFromPossibleSymlink<T>(longname: string, doLoad: (link: string) => Promise<T | undefined>): Promise<T> {
    const originalNamePromise = doLoad(longname)
    const symlinkPromise = loadWithSymlink(longname, doLoad)
    const [original, symlink] = await Promise.all([originalNamePromise, symlinkPromise])
    const selected = original ?? symlink
    if (selected === undefined) {
        throw new Error(`Could not find article ${longname}`)
    }
    return selected
}

export async function loadArticleFromPossibleSymlink(longname: string): Promise<Article> {
    return loadProtobufFromPossibleSymlink(longname, link =>
        loadArticleFromConsolidatedShard(dataLink(link), link))
}

export async function loadFeatureFromPossibleSymlink(longname: string): Promise<Feature> {
    return loadProtobufFromPossibleSymlink(longname, link =>
        loadFeatureFromConsolidatedShard(shapeLink(link), link))
}

export function loadArticlesFromPossibleSymlink(longnames: string[]): Promise<Article[]> {
    return Promise.all(longnames.map(loadArticleFromPossibleSymlink))
}
