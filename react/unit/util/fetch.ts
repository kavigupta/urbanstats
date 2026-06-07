import { port } from '../../port'

const originalFetch = global.fetch
global.fetch = (path, ...args) => {
    return originalFetch(`http://localhost:${port()}${path}`, ...args)
}
