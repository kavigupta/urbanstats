import maplibregl from 'maplibre-gl'

import { performPartitioning } from './map-partition'

function main(): void {
    const arg = process.argv[2]
    if (!arg) {
        console.error('Usage: partition_script <bounding_boxes_json>')
        process.exit(1)
    }
    let boxes: unknown
    try {
        boxes = JSON.parse(arg)
    }
    catch {
        console.error('Invalid JSON input')
        process.exit(1)
    }
    if (!Array.isArray(boxes) || !boxes.every(
        b => Array.isArray(b) && b.length === 2 && b.every(
            c => Array.isArray(c) && c.length === 2 && c.every(n => typeof n === 'number'),
        ),
    )) {
        console.error('Input must be an array of bounding boxes: [[west, south], [east, north]]')
        process.exit(1)
    }
    const bounds = (boxes as [[number, number], [number, number]][]).map(
        ([sw, ne]) => new maplibregl.LngLatBounds(
            new maplibregl.LngLat(sw[0], sw[1]),
            new maplibregl.LngLat(ne[0], ne[1]),
        ),
    )
    const result = performPartitioning(bounds)
    process.stdout.write(`${JSON.stringify(result)}\n`)
}

try {
    main()
}
catch (e: unknown) {
    console.error(e)
    process.exit(1)
}
