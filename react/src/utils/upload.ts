export const cancelled = Symbol()

export function uploadFile(accept: string): Promise<File | typeof cancelled> {
    const inputElement = document.createElement('input')
    inputElement.setAttribute('type', 'file')
    inputElement.setAttribute('accept', accept)
    inputElement.style.display = 'none'
    const result = new Promise<File | typeof cancelled>((resolve) => {
        inputElement.onchange = () => {
            resolve(inputElement.files![0])
            inputElement.remove()
        }
        inputElement.oncancel = () => {
            resolve(cancelled)
            inputElement.remove()
        }
    })

    document.body.appendChild(inputElement)
    inputElement.click()

    return result
}
