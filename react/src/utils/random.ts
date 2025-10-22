export function randomID(numCharacters = 15): string {
    let randomHex = ''
    for (let i = 0; i < numCharacters; i++) {
        randomHex += Math.floor(Math.random() * 16).toString(16)[0]
    }
    return randomHex
}

export function randomBase62ID(numCharacters: number): string {
    const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let result = ''
    for (let i = 0; i < numCharacters; i++) {
        result += characters[Math.floor(Math.random() * characters.length)]
    }
    return result
}
