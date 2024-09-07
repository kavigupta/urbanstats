declare module 'dom-to-image-more' {
    function toPng(e: HTMLElement, options: {
        bgcolor: string
        height: number
        width: number
        style: React.CSSProperties
    }): Promise<string>
}
