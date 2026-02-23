export function sanitize(longname: string): string {
    return longname.replaceAll('/', ' slash ')
}
