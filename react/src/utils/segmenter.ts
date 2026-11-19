// Firefox before 125 lacks Intl.Segmenter.
export async function installSegmenterPolyfill(): Promise<void> {
    if (typeof Intl.Segmenter !== 'undefined') {
        return
    }
    await import('@formatjs/intl-segmenter/polyfill.js')
}
