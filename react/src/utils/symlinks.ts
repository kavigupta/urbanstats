import SYMLINKS from '../data/symlinks'
import { loadProtobuf } from '../load_json'
import { dataLink, symlinksLink } from '../navigation/links'

import { Article } from './protos'

async function loadWithSymlink(longname: string): Promise<Article | undefined> {
    const symlinks = await loadProtobuf(symlinksLink(longname), 'Symlinks', false)
    console.log('symlinks', symlinks)
    if (symlinks === undefined) {
        return undefined
    }
    const idx = symlinks.linkName.indexOf(longname)
    if (idx === -1) {
        return undefined
    }
    return await loadProtobuf(dataLink(symlinks.targetName[idx]), 'Article', false)
}

export async function loadArticleFromPossibleSymlink(longname: string): Promise<Article> {
    const originalNamePromise = loadProtobuf(dataLink(longname), 'Article', false)
    const symlinkPromise = loadWithSymlink(longname)
    const [original, symlink] = await Promise.all([originalNamePromise, symlinkPromise])
    const selected = original || symlink
    if (selected === undefined) {
        throw new Error(`Could not find article ${longname}`)
    }
    return selected
}

export function loadArticlesFromPossibleSymlink(longnames: string[]): Promise<Article[]> {
    return Promise.all(longnames.map(loadArticleFromPossibleSymlink))
}
