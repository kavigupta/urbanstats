export function camelToHuman(str: string): string {
    const pascal = str.charAt(0).toUpperCase() + str.slice(1)
    return pascal.replaceAll(/([A-Z])/g, ' $1').trim()
}
