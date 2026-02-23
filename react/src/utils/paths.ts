export function sanitize(longname: string, spaces_around_slash = true): string {
    let x = longname
    if (spaces_around_slash) {
        x = x.replaceAll('/', ' slash ')
    }
    else {
        x = x.replaceAll('/', 'slash')
    }
    x = x.replaceAll('%', '%25')
    return x
}
