declare module 'base58-js' {
    function base58_to_binary(s: string): Uint8Array
    function binary_to_base58(a: Uint8Array | number[]): string
}
