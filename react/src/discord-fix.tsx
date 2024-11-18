export function discordFix(): void {
    // https://github.com/kavigupta/urbanstats/issues/299
    if (window.location.search.includes('%25%26')) {
        window.location.search = window.location.search.replaceAll('%25%26', '%25&')
    }
}
