export function discordFix(url: string): string {
    // https://github.com/kavigupta/urbanstats/issues/299
    return url.replaceAll('%25%26', '%25&')
}
