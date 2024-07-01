import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Statistic } from "./table.js";
import { MapGeneric, MapGenericProps } from "./map.js";
import { Related } from "./related-button.js";
import { PageTemplate } from "../page_template/template";
import "../common.css";
import "./article.css";
import { loadProtobuf } from '../load_json';
import { consolidated_shape_link, consolidated_stats_link } from '../navigation/links.js';
import { interpolate_color } from '../utils/color.js';

import { Keypoints, RAMPS, Ramp, parse_ramp } from "../mapper/ramps";
import { ColorStat, ColorStatDescriptor, LineStyle, MapSettings, MapperSettings, StatisticsForGeography, default_settings, parse_color_stat } from "../mapper/settings";

import { gunzipSync, gzipSync } from "zlib";
import { useResponsive } from '../utils/responsive.js';
import { NormalizeProto } from "../utils/types.js";
import { AllStats, ConsolidatedShapes, ConsolidatedStatistics, Feature } from "../utils/protos.js";

interface EmpiricalRamp {
    ramp: Keypoints, interpolations: number[]
}

interface Filter { enabled: boolean, function: ColorStatDescriptor }

interface DisplayedMapProps extends MapGenericProps {
    underlying_shapes: Promise<{ longnames: string[], shapes: NormalizeProto<Feature>[] }>;
    line_style: LineStyle;
    underlying_stats: Promise<{ stats: StatisticsForGeography, longnames: string[] }>;
    filter?: ColorStat;
    color_stat: ColorStat;
    ramp: Ramp;
    ramp_callback: (ramp: EmpiricalRamp) => void;
}

class DisplayedMap extends MapGeneric<DisplayedMapProps> {

    private name_to_index?: Record<string, number>

    constructor(props: DisplayedMapProps) {
        super(props);
        this.name_to_index = undefined;
    }

    async guarantee_name_to_index() {
        if (this.name_to_index === undefined) {
            const result = (await this.props.underlying_shapes).longnames;
            this.name_to_index = {};
            for (let i = 0; i < result.length; i++) {
                this.name_to_index[result[i]] = i;
            }
        }
    }

    async loadShape(name: string) {
        await this.guarantee_name_to_index();
        const index = this.name_to_index![name];
        const data = (await this.props.underlying_shapes).shapes[index];
        return data;
    }


    async compute_polygons() {
        // reset index
        this.name_to_index = undefined;
        await this.guarantee_name_to_index();

        const line_style = this.props.line_style;

        var stats = (await this.props.underlying_stats);
        // TODO correct this!
        if (this.props.filter !== undefined) {

            const filter_vals = this.props.filter.compute(stats.stats);
            stats = {
                stats: stats.stats.filter((x, i) => filter_vals[i]),
                longnames: stats.longnames.filter((x, i) => filter_vals[i]),
            }
        }
        const stat_vals = this.props.color_stat.compute(stats.stats);
        const names = stats.longnames;
        const [ramp, interpolations] = this.props.ramp.create_ramp(stat_vals);
        this.props.ramp_callback({ ramp: ramp, interpolations: interpolations });
        const colors = stat_vals.map(
            val => interpolate_color(ramp, val)
        );
        const styles = colors.map(
            // no outline, set color fill, alpha=1
            color => ({
                fillColor: color,
                fillOpacity: 1,
                color: line_style.color,
                opacity: 1,
                weight: line_style.weight,
            })
        );
        const metas = stat_vals.map((x) => { return { statistic: x } });
        return [names, styles, metas, -1] as const;
    }

    async mapDidRender() {
        // zoom map to fit united states
        // do so instantly
        this.map!.fitBounds([
            [49.3457868, -124.7844079],
            [24.7433195, -66.9513812]
        ], { animate: false });
    }
}


function Colorbar(props: { ramp?: EmpiricalRamp, name: string }) {
        // do this as a table with 10 columns, each 10% wide and
        // 2 rows. Top one is the colorbar, bottom one is the
        // labels.
        if (props.ramp === undefined) {
            return <div></div>;
        }
        const steps = 10;
        const min = props.ramp.ramp[0][0];
        const max = props.ramp.ramp[props.ramp.ramp.length - 1][0];
        const range = max - min;
        const values = props.ramp.interpolations;

        const create_value = (stat: number) => {
            return <div className="centered_text">
                <Statistic
                    statname={props.name}
                    value={stat}
                    is_unit={false}
                />
                <Statistic
                    statname={props.name}
                    value={stat}
                    is_unit={true}
                />
            </div>
        }

        return (
            <div>
                <table style={{ width: "100%", height: "100%" }}>
                    <tbody>
                        <tr>
                            {
                                values.map((x, i) => (
                                    <td key={i} style={
                                        {
                                            width: "10%", height: "1em",
                                            backgroundColor: interpolate_color(props.ramp!.ramp, x)
                                        }
                                    }>
                                    </td>
                                ))
                            }
                        </tr>
                        <tr>
                            {
                                values.map((x, i) => (
                                    <td key={i} style={{ width: "10%", height: "1em" }}>
                                        {create_value(x)}
                                    </td>
                                ))
                            }
                        </tr>
                    </tbody>
                </table>
                <div className="centered_text">
                    {props.name}
                </div>
            </div>
        );
    }

type MapComponentProps = { 
    name_to_index: Record<string, number>, 
    color_stat: ColorStatDescriptor | undefined,
    filter: Filter, 
    settings: MapSettings;
    height?: string;
    map_ref: React.RefObject<DisplayedMap>
} & Pick<DisplayedMapProps, 'underlying_shapes' | 'underlying_stats' | 'ramp' | 'line_style' | 'basemap'>

function MapComponent(props: MapComponentProps) {

        const color_stat = parse_color_stat(props.name_to_index, props.color_stat);
        const filter = props.filter.enabled ? parse_color_stat(props.name_to_index, props.filter.function) : undefined;

        const [empiricalRamp, setEmpiricialRamp] = useState<EmpiricalRamp | undefined>(undefined);

        return (
            <div style={{
                display: "flex",
                flexDirection: "column",
                height: props.height,
            }}>
                <div style={{ height: "90%", width: "100%" }}>
                    <DisplayedMap
                        id="mapper"
                        color_stat={color_stat}
                        filter={filter}
                        underlying_shapes={props.underlying_shapes}
                        underlying_stats={props.underlying_stats}
                        ramp={props.ramp}
                        ramp_callback={setEmpiricialRamp}
                        ref={props.map_ref}
                        line_style={props.line_style}
                        basemap={props.basemap}
                        height={props.height}
                    />
                </div>
                <div style={{ height: "8%", width: "100%" }}>
                    <Colorbar
                        name={color_stat.name()}
                        ramp={empiricalRamp}
                    />
                </div>
            </div>
        )
}

function saveAsFile(filename: string, data: BlobPart, type: string) {
    const blob = new Blob([data], { type: type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function Export(props: { map_ref: React.RefObject<DisplayedMap> }) {

    const exportAsSvg = async () => {
        if (props.map_ref.current === null) {
            return;
        }
        const svg = await props.map_ref.current.exportAsSvg();
        saveAsFile("map.svg", svg, "image/svg+xml");
    }

    const exportAsGeoJSON = async () => {
        if (props.map_ref.current === null) {
            return;
        }
        const geojson = await props.map_ref.current.exportAsGeoJSON();
        saveAsFile("map.geojson", geojson, "application/geo+json");
    }


        return <div>
            <button onClick={exportAsSvg}>Export as SVG</button>
            <button onClick={exportAsGeoJSON}>Export as GeoJSON</button>
            <button onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("view", "true");
                // navigate to the page in a new tab
                window.open("?" + params.toString(), "_blank");
            }
            }>View as Zoomable Page</button>
        </div>
}

function mapSettingsFromURLParams(): MapSettings {
    const params = new URLSearchParams(window.location.search);
    const encoded_settings = params.get("settings");
    let settings = {}
    if (encoded_settings !== null) {
        const jsoned_settings = gunzipSync(Buffer.from(encoded_settings, 'base64')).toString();
        settings = JSON.parse(jsoned_settings);
    }
    return default_settings(settings);
}

export function MapperPanel() {

    const names = useMemo(() => require("../data/statistic_name_list.json") as string[], []);
    const valid_geographies = useMemo(() => require("../data/mapper/used_geographies.json"), []);

    const name_to_index = Object.fromEntries(names.map((name, i) => [name, i]))

    const [map_settings, set_map_settings] = useState(mapSettingsFromURLParams)

    const underlying_shapes: DisplayedMapProps['underlying_shapes'] = useMemo(async () => {
        const consolidateShapes = await loadProtobuf(
            consolidated_shape_link(map_settings.geography_kind),
            "ConsolidatedShapes"
        )
        return {
            ...consolidateShapes,
            shapes: consolidateShapes.shapes.map(Feature.create) as NormalizeProto<Feature>[]
        }
    }, [map_settings.geography_kind]);

    const underlying_stats: DisplayedMapProps['underlying_stats'] = useMemo(async () => {
        const consolidatedStatistics = await loadProtobuf(
            consolidated_stats_link(map_settings.geography_kind),
            "ConsolidatedStatistics"
        )
        return {
            ...consolidatedStatistics,
            stats: consolidatedStatistics.stats.map(AllStats.create) as NormalizeProto<AllStats>[]
        }
    }, [map_settings.geography_kind])

    const map_ref = useRef(null)

    useEffect(() => {
        const jsoned_settings = JSON.stringify(map_settings);
        // gzip then base64 encode
        const encoded_settings = gzipSync(jsoned_settings).toString("base64");
        // convert to parameters like ?settings=...
        const params = new URLSearchParams(window.location.search);
        params.set("settings", encoded_settings);
        // window.history.replaceState(null, null, "?" + params.toString());
        // back button should work
        window.history.pushState(null, '', "?" + params.toString());
    }, [map_settings])

    useEffect(() => {
        const listener = () => set_map_settings(mapSettingsFromURLParams())
        window.addEventListener('popstate', listener);
        return () => window.removeEventListener('popstate', listener)
    })

    const responsive = useResponsive()

    const mapperPanel = (height?: string) => {
        const ramp = parse_ramp(map_settings.ramp);
        return <MapComponent
            name_to_index={name_to_index}
            underlying_shapes={underlying_shapes}
            underlying_stats={underlying_stats}
            ramp={ramp}
            color_stat={map_settings.color_stat}
            filter={map_settings.filter}
            map_ref={map_ref}
            line_style={map_settings.line_style}
            basemap={map_settings.basemap}
            height={height}
            settings={map_settings}
        />
    }

    if (new URLSearchParams(window.location.search).get("view") === "true") {
        return mapperPanel("100%");
    }

    const valid = valid_geographies.includes(map_settings.geography_kind);

    const mainContent = (
        <div>
            <div className={responsive.headerTextClass}>Urban Stats Mapper (beta)</div>
            <MapperSettings
                valid_geographies={valid_geographies}
                map_settings={map_settings}
                set_map_settings={(settings) => set_map_settings(settings)}
            />
            <Export
                map_ref={map_ref}
            />
            {
                !valid ? <div>Invalid geography kind</div> :
                    mapperPanel(undefined) // use default height
            }
        </div>
    );

    return <PageTemplate mainContent={() => mainContent} />
}

