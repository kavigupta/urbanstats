import { gunzipSync, gzipSync } from 'zlib'

export function base64Gzip(data: string): string {
    return gzipSync(data).toString('base64')
}

export function base64Gunzip(data: string): string {
    return gunzipSync(Buffer.from(data, 'base64')).toString()
}
