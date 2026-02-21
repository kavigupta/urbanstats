/**
 * Start the CI proxy locally (port 8000).
 * Serves test/density-db first, then proxies to cdn.jsdelivr.net (densitydb.github.io).
 *
 * Requires:
 *   URBANSTATS_BRANCH_NAME - branch to use (e.g. master); densitydb branch is matched or falls back to master
 *   GITHUB_TOKEN          - for Octokit to resolve densitydb branch SHA (optional if you set a default below)
 *
 * Example:
 *   URBANSTATS_BRANCH_NAME=master GITHUB_TOKEN=ghp_xxx npx tsx test/scripts/run-proxy.ts
 */

import { startProxy } from './ci_proxy'

const branch = process.env.URBANSTATS_BRANCH_NAME ?? 'master'
process.env.URBANSTATS_BRANCH_NAME = branch

await startProxy()
console.warn('Proxy listening on http://localhost:8000')
