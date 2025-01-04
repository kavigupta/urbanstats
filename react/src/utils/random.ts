export function randomID(): string {
    let randomHex = ''
    for (let i = 0; i < 15; i++) {
        randomHex += Math.floor(Math.random() * 16).toString(16)[0]
    }
    return randomHex
}
