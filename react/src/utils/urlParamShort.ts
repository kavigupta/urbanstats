import { gunzipSync, gzipSync } from 'zlib'

export function base64Gzip(data: string): string {
    return gzipSync(data).toString('base64')
}

export function base64Gunzip(data: string): string {
    console.log('data', data)
    const dataBytes = Buffer.from(data, 'base64')
    console.log('dataBytes', dataBytes)
    return gunzipSync(dataBytes).toString()
}
