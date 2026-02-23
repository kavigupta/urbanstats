/**
 * Sanitize longnames for use in paths (shard names, filenames, etc.).
 */

export function sanitize(longname: string, spacesAroundSlash = true): string {
    let x = longname
    if (spacesAroundSlash) {
        x = x.replaceAll('/', ' slash ')
    }
    else {
        x = x.replaceAll('/', 'slash')
    }
    x = x.replaceAll('%', '%25')
    return x
}
