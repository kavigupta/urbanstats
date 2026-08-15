# Link embed renderer

Renders an Urban Stats page to a PNG for use as an `og:image`, by driving a pool of
warm headless Chrome pages through the site's own screenshot pipeline.

```
GET /render/article.html?longname=Chicago+city%2C+Illinois%2C+USA
```

The path after `/render` is the page to screenshot, so a Cloudflare route can map an
image request onto it by swapping the prefix.

## How it works

The service does not take a viewport screenshot. It calls `window.testUtils.screencap()`,
which runs the same code as the in-app screenshot button and composes the header, table,
map, and footer banner onto one canvas. That path already waits for map tiles and
screenshot-mode layout to settle, so there is no guessing about when a page is ready.

This depends on two hooks the site exposes on `TestUtils`, `screencap` and `navigate`.
A build without them cannot be rendered, and the pool will fail to warm.

Pages are kept warm and navigated in-page rather than reloaded, which skips the document
load and keeps the map's tile cache alive between renders -- roughly halving render time.

## Running locally

Needs a site to point at, and `npx playwright install chromium` once.

```sh
npm install
URBANSTATS_ORIGIN=http://localhost:8000 npm start
```

`POOL_SIZE` sets warm pages and doubles as the concurrency limit. `CAPTURE_SCALE`
multiplies the width the page asks for; `IMAGE_TYPE` takes any canvas mime type.

`probe.js` measures where render time goes, and `probe-scale.js` measures the effect of
scale and encoding. Both expect a site already running.

## Deploying

```sh
cd ansible
ansible-playbook -i inventory.ini site.yml
```

The image is built **on the host**, unlike draw.fish: there is no build step, and pulling
the ~2GB playwright base from a registry beats pushing it over SSH.

The service is published to `127.0.0.1:8010` only, so reach it over a tunnel:

```sh
ssh -N -L 8010:127.0.0.1:8010 root@107.191.113.103
```

Memory is the constraint worth watching. A warm page holds a loaded copy of the site and
grows with every render as the tile cache fills, so `pool_size` is what to turn down first
if the host starts swapping.
