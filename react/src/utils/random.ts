export function randomID(numCharacters = 15): string {
    const bytes = new Uint8Array(numCharacters)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, byte => (byte & 0xf).toString(16)).join('')
}

export function randomBase62ID(numCharacters: number): string {
    const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let result = ''
    for (let i = 0; i < numCharacters; i++) {
        result += characters[Math.floor(Math.random() * characters.length)]
    }
    return result
}
