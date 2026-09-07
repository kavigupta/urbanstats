/** The generated HTML loads `/scripts/index.js`, so a bundle mounted only at the root is ignored. */
import express from 'express'

const [bundle, site, port] = process.argv.slice(2)

const app = express()
app.use('/scripts', express.static(bundle))
app.use(express.static(site))
app.listen(Number(port))
