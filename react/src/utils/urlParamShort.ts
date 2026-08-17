import { gunzip, gzip } from './gzip'

export async function base64Gzip(data: string): Promise<string> {
    const compressed = await gzip(new TextEncoder().encode(data))
    let binary = ''
    for (const byte of compressed) {
        binary += String.fromCharCode(byte)
    }
    return btoa(binary)
}

export async function base64Gunzip(data: string): Promise<string> {
    const compressed = Uint8Array.from(atob(data), character => character.charCodeAt(0))
    return new TextDecoder().decode(await gunzip(compressed))
}
