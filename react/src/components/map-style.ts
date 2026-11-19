import { StyleSpecification } from 'maplibre-gl'

// a copy of https://tiles.openfreemap.org/styles/bright
import mapStyleJson from '../data/map_style.json'

export const mapStyle = mapStyleJson as unknown as StyleSpecification

export const mapBackgroundColor = (mapStyle.layers.find(layer => layer.id === 'background') as { paint: { 'background-color': string } }).paint['background-color']
