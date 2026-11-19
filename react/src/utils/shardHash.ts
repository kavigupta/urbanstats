/** Hash value used in the shard index (must match Python: int(hex_string, 16) where hex_string is LSB-first). */
export function shardBytesFullNum(sanitizedLongname: string): number {
    const bytes = new TextEncoder().encode(sanitizedLongname)
    let hash = 0
    for (const byte of bytes) {
        hash = (hash * 31 + byte) & 0xffffffff
    }
    let s = ''
    for (let i = 0; i < 8; i++) {
        s += (hash & 0xf).toString(16)
        hash = hash >>> 4
    }
    return parseInt(s, 16) >>> 0
}
