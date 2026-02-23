/**
 * Shard hashing for shard paths. Callers should pass sanitized longnames (see paths.ts).
 * No app dependencies so tests can import only this for hash collision checks.
 */

/** Full 8-char hex hash for ordering; must match Python shard_bytes_full. */
export function shardBytesFull(sanitizedLongname: string): string {
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
    return s
}

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

/** First 2 + 1 hex chars; used only for symlinks folder names. */
export function shardBytes(sanitizedLongname: string): [string, string] {
    const full = shardBytesFull(sanitizedLongname)
    return [full.slice(0, 2), full.slice(2, 3)]
}
