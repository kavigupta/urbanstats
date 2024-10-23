const SYMLINKS = require('../data/symlinks.json') as Record<string, string>

export function followSymlink(name: string): [string, boolean] {
    if (name in SYMLINKS) {
        return [SYMLINKS[name], true]
    }
    return [name, false]
}

export function followSymlinks(names: string[]): [string[], boolean] {
    let changed = false
    const result = names.map((name) => {
        const [newName, didChange] = followSymlink(name)
        changed = changed || didChange
        return newName
    })
    return [result, changed]
}
