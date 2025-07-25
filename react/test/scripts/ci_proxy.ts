/**
 * On the test CI, we want to have multiple test runners in parallel.
 *
 * However, pulling down the densitydb repo to run the tests against each time is expensive.
 *
 * So, our strategy will be to serve the local files generated by generate_site.py,
 * and then any files not generated, we'll proxy the request to a CI proxy that has a copy of densitydb.
 */

import compression from 'compression'
import express from 'express'
import proxy from 'express-http-proxy'
import { z } from 'zod'

export function startProxy(): void {
    const ciProxyOrigin = z.string().min(1).parse(process.env.CI_PROXY_ORIGIN)

    // This is useful for debugging in case the proxy isn't working
    console.warn('Proxy is using origin...', ciProxyOrigin)

    const app = express()

    app.use(compression({ enforceEncoding: 'gzip' }))

    app.use(
        express.static('test/density-db'),
        proxy(ciProxyOrigin), // Contacts the proxy in react/ci_proxy
    )

    app.listen(8000)
}
