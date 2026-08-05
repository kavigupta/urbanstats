import { Agent, setGlobalDispatcher } from 'undici'

import { port } from '../../port'

// Unit tests block the event loop for seconds at a time, which is long enough for the dev server to
// close an idle keep-alive connection without undici getting a chance to evict it from its pool.
// Reusing one of those connections fails with ECONNRESET, so don't reuse connections at all.
setGlobalDispatcher(new Agent({ pipelining: 0 }))

const originalFetch = global.fetch
global.fetch = (path, ...args) => {
    return originalFetch(`http://localhost:${port()}${path}`, ...args)
}
