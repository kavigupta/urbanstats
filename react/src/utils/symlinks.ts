import SYMLINKS from '../data/symlinks'
import { loadProtobuf } from '../load_json'
import { dataLink } from '../navigation/links'

import { Article } from './protos'

function followSymlink(name: string): string {
    if (name in SYMLINKS) {
        return SYMLINKS[name]
    }
    return name
}

export function loadArticleFromPossibleSymlink(longname: string): Promise<Article> {
    longname = followSymlink(longname)
    return loadProtobuf(dataLink(longname), 'Article')
}

export function loadArticlesFromPossibleSymlink(longnames: string[]): Promise<Article[]> {
    return Promise.all(longnames.map(loadArticleFromPossibleSymlink))
}
