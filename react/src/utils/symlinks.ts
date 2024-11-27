import SYMLINKS from '../data/symlinks'

export function followSymlink(name: string): string {
    if (name in SYMLINKS) {
        return SYMLINKS[name]
    }
    return name
}

export function followSymlinks(names: string[]): string[] {
    return names.map(name => followSymlink(name))
}
