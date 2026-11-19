export function loadImage(src: string): Promise<HTMLImageElement> {
    const result = new Image()
    return new Promise((resolve) => {
        result.onload = () => { resolve(result) }
        result.src = src
    })
}
