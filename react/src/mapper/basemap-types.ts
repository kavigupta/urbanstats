/**
 * Basemap types live here (not in settings/utils) so urban-stats-script constants
 * can import them without creating a cycle: constants → map → … → context → constants.
 */
export interface LineStyle {
    color: string
    weight: number
}

export type Basemap = {
    type: 'osm'
    noLabels?: boolean
    subnationalOutlines?: LineStyle
} | { type: 'none', backgroundColor: string, textColor: string }
