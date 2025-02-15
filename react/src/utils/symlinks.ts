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

function followSymlinks(names: string[]): string[] {
    return names.map(name => followSymlink(name))
}

export function loadArticleFromPossibleSymlink(longname: string): Promise<Article> {
    return loadProtobuf(dataLink(longname), 'Article')
}

export function loadArticlesFromPossibleSymlink(names: string[]): Promise<Article[]> {
    return Promise.all(names.map(loadArticleFromPossibleSymlink))
}
