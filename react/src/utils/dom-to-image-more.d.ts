declare module 'dom-to-image-more' {
    function toCanvas(e: HTMLElement, options: {
        bgcolor: string
        height: number
        width: number
        style: React.CSSProperties
        filter: (node: Node) => boolean
    }): Promise<HTMLCanvasElement>
}
