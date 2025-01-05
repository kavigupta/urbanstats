export function randomID(numCharacters = 15): string {
    let randomHex = ''
    for (let i = 0; i < numCharacters; i++) {
        randomHex += Math.floor(Math.random() * 16).toString(16)[0]
    }
    return randomHex
}
