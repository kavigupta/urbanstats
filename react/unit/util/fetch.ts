import { Agent, setGlobalDispatcher } from 'undici'

import { port } from '../../port'

// Unit tests block the event loop long enough for the dev server to close idle keep-alive sockets
// before undici evicts them, and reusing one fails with ECONNRESET.
setGlobalDispatcher(new Agent({ pipelining: 0 }))

const originalFetch = global.fetch
global.fetch = (path, ...args) => {
    return originalFetch(`http://localhost:${port()}${path}`, ...args)
}
