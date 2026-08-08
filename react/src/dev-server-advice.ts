// Bundled only when serving. The dev-server client already prints compile and
// type-check errors to the console; this adds what those errors don't say --
// the page is the last bundle that compiled, and where to look for the rest.

const advice = [
    `[failtest] The dev server's build is failing, so this page is running the last bundle that compiled.`,
    `Recent source changes are NOT reflected here, and any test running against this page is testing stale code.`,
    `The compiler output above is also in react/dev-server.log, along with everything that preceded it.`,
    `If the build looks stuck rather than broken, run \`killall rspack-node\`; the watcher restarts itself.`,
].join('\n')

const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`)

socket.addEventListener('message', (event: MessageEvent<string>) => {
    const message = JSON.parse(event.data) as { type?: string }
    // Only errors block the reload. Warnings still ship a fresh bundle.
    if (message.type === 'errors') {
        console.error(advice)
    }
})
