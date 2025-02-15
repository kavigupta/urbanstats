import SYMLINKS from '../data/symlinks'
import { loadProtobuf } from '../load_json'
import { dataLink, symlinksLink } from '../navigation/links'

import { Article } from './protos'

function followSymlink(name: string): string {
    if (name in SYMLINKS) {
        return SYMLINKS[name]
    }
    return name
}

export async function loadArticleFromPossibleSymlink(longname: string): Promise<Article> {
    const symlinks = await loadProtobuf(symlinksLink(longname), 'Symlinks')
    longname = followSymlink(longname)
    return await loadProtobuf(dataLink(longname), 'Article')
}

export function loadArticlesFromPossibleSymlink(longnames: string[]): Promise<Article[]> {
    return Promise.all(longnames.map(loadArticleFromPossibleSymlink))
}
