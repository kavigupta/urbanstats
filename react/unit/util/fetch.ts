const originalFetch = global.fetch
global.fetch = (path, ...args) => {
    return originalFetch(`http://localhost:8000${path}`, ...args)
}
