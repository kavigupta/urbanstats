import http from 'http'
import { AddressInfo } from 'net'

import sharp from 'sharp'
import { ClientFunction, RequestMock, Selector } from 'testcafe'

import { getLocation, target, urbanstatsFixture } from './test_utils'

// The git endpoints only exist on the dev server, and CI's checkout has no history to compare anyway.

const width = 20
const height = 10

function png(paint: (x: number, y: number) => [number, number, number]): Promise<Buffer> {
    const data = new Uint8Array(width * height * 4)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            data.set([...paint(x, y), 255], (y * width + x) * 4)
        }
    }
    return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

const white = png(() => [255, 255, 255])
const redSquare = png((x, y) => x >= 5 && x < 9 && y >= 2 && y < 6 ? [255, 0, 0] : [255, 255, 255])
const offByOne = png((x, y) => x === 0 && y === 0 ? [254, 255, 255] : [255, 255, 255])

const files: Record<string, { status: string, base?: Promise<Buffer> | string, head?: Promise<Buffer> | string }> = {
    't1/Chrome/added.png': { status: 'A', head: white },
    't1/Chrome/changed.png': { status: 'M', base: white, head: redSquare },
    't1/Chrome/deleted.png': { status: 'D', base: white },
    't1/Chrome/tiny.png': { status: 'M', base: white, head: offByOne },
    't1/Chrome/values.csv': { status: 'M', base: 'a,1\nb,2\n', head: 'a,2\nb,2\n' },
    't2/Chrome/other.png': { status: 'A', head: white },
}

// TestCafe stringifies a mocked body, which mangles a PNG, so the mock redirects files to this instead
const fileServer = http.createServer((req, res) => {
    void (async () => {
        const url = new URL(req.url!, 'http://localhost')
        const file = files[url.searchParams.get('path')!]
        res.setHeader('access-control-allow-origin', '*')
        res.end(await (url.searchParams.get('ref') === 'base' ? file.base : file.head))
    })()
}).listen(0)
fileServer.unref()

const gitMock = RequestMock()
    .onRequestTo(/\/local-snapshots\/git\//)
    .respond((req, res) => {
        const url = new URL(req.url)
        if (url.pathname.endsWith('/changes')) {
            if (url.searchParams.get('base') !== 'base') {
                res.statusCode = 400
                res.setBody(`fatal: bad revision '${url.searchParams.get('base')}'`)
                return
            }
            res.headers['content-type'] = 'application/json'
            res.setBody(JSON.stringify(Object.entries(files).map(([path, { status }]) => ({ status, path }))))
            return
        }
        res.statusCode = 302
        res.headers.location = `http://localhost:${(fileServer.address() as AddressInfo).port}/${url.search}`
    })

function viewer(params: Record<string, string>): string {
    return `${target}/snapshot-diff-viewer.html?${new URLSearchParams(params).toString()}`
}

const header = Selector('h2')

urbanstatsFixture('snapshot diff viewer between git refs', viewer({ base: 'base', head: 'head', index: '1' }), undefined, { requestHooks: [gitMock] })

const deltaPixel = ClientFunction((x: number, y: number) => {
    const img = document.querySelectorAll<HTMLImageElement>('.container img')[1]
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const context = canvas.getContext('2d')!
    context.drawImage(img, 0, 0)
    return Array.from(context.getImageData(x, y, 1, 1).data)
})

test('marks the changed pixels and rows', async (t) => {
    await t.expect(header.textContent).eql('(2 / 6) t1 / changed.png')
    const images = Selector('.container img')
    await t.expect(images.count).eql(3)
    await t.expect(deltaPixel(6, 3)).eql([255, 0, 255, 255])
    await t.expect(deltaPixel(0, 3)).eql([255, 255, 255, 255])
    // The indicator column, beside the image
    await t.expect(deltaPixel(width + 50, 3)).eql([255, 0, 255, 255])
    await t.expect(deltaPixel(width + 50, 0)).eql([0, 0, 0, 255])
})

test('forgives what CI forgives', async (t) => {
    await t.navigateTo(viewer({ base: 'base', head: 'head', index: '3' }))
    await t.expect(Selector('h1').withExactText('Within tolerance').exists).ok()
})

test('diffs text', async (t) => {
    await t.navigateTo(viewer({ base: 'base', head: 'head', index: '4' }))
    await t.expect(Selector('.diff-removed').withExactText('-a,1').exists).ok()
    await t.expect(Selector('.diff-added').withExactText('+a,2').exists).ok()
})

test('shows added and deleted files', async (t) => {
    await t.navigateTo(viewer({ base: 'base', head: 'head', index: '0' }))
    await t.expect(Selector('h1').withExactText('New File').exists).ok()
    await t.navigateTo(viewer({ base: 'base', head: 'head', index: '2' }))
    await t.expect(Selector('h1').withExactText('Deleted File').exists).ok()
    await t.expect(Selector('.container img').count).eql(1)
})

test('navigates with the buttons and arrow keys', async (t) => {
    await t.click(Selector('button').withExactText('Forward →'))
    await t.expect(header.textContent).eql('(3 / 6) t1 / deleted.png')
    await t.expect(getLocation()).contains('index=2')
    await t.pressKey('left left')
    await t.expect(header.textContent).eql('(1 / 6) t1 / added.png')
    await t.expect(Selector('button').withExactText('← Back').hasAttribute('disabled')).ok()
})

test('narrows to the given tests', async (t) => {
    await t.navigateTo(viewer({ base: 'base', head: 'head', tests: 't2' }))
    await t.expect(header.textContent).eql('(1 / 1) t2 / other.png')
})

test('shows a bad ref rather than loading forever', async (t) => {
    await t.navigateTo(viewer({ base: 'bad' }))
    await t.expect(Selector('pre').withExactText('Error: fatal: bad revision \'bad\'').exists).ok()
})
