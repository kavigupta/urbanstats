export { ArticlePanel };
import React, { useRef } from 'react';


import { StatisticRowRaw } from "./table";
import { Map } from "./map";
import { Related } from "./related-button";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { load_article } from './load-article';
import { comparisonHeadStyle, headerTextClass, subHeaderTextClass } from '../utils/responsive';
import { SearchBox } from './search';
import { article_link, comparison_link, sanitize } from '../navigation/links';
import { longname_is_exclusively_american, useUniverse } from '../universe';
import { useSetting, useTableCheckboxSettings } from '../page_template/settings';

function ArticlePanel(props) {
    const table_ref = useRef(null);
    const headers_ref = useRef(null);
    const map_ref = useRef(null);

    const screencap_elements = () => ({
        path: sanitize(props.longname) + ".png",
        overall_width: table_ref.current.offsetWidth * 2,
        elements_to_render: [headers_ref.current, table_ref.current, map_ref.current],
    });

    console.log("table_ref", table_ref);
    const main_content = (template_info) => {
        console.log("table_ref", table_ref);
        if (props.articleType == undefined) {
            throw new Error("articleType is undefined");
        }
        return (
            <div>
                <div ref={headers_ref}>
                    <div className={headerTextClass()}>{props.shortname}</div>
                    <div className={subHeaderTextClass()}>{props.longname}</div>
                </div>
                <div style={{ marginBlockEnd: "16px" }}></div>

                <div className="stats_table" ref={table_ref}>
                    <StatisticRowHeader />
                    <ArticlePanelRows
                        longname={props.longname}
                        article_row={props}
                    />
                </div>

                <p></p>

                <div ref={map_ref}>
                    <Map id="map"
                        longname={props.longname}
                        related={props.related}
                        article_type={props.articleType}
                        basemap={{ type: "osm" }}
                    />
                </div>

                <div style={{ marginBlockEnd: "1em" }}></div>

                <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ width: "30%", marginRight: "1em" }}>
                        <div className="serif" style={comparisonHeadStyle("right")}>Compare to: </div>
                    </div>
                    <div style={{ width: "70%" }}>
                        <ComparisonSearchBox longname={props.longname} />
                    </div>
                </div>

                <script src="/scripts/map.js"></script>

                <Related
                    related={props.related}
                    article_type={props.articleType}
                />
            </div>
        );
    }
    return <PageTemplate
        main_content={main_content}
        screencap_elements={screencap_elements}
        universes={props.universes}
    />
}

function ComparisonSearchBox(props) {
    const curr_universe = useUniverse();
    return <SearchBox
        style={{ ...comparisonHeadStyle(), width: "100%" }}
        placeholder={"Other region..."}
        on_change={(x) => {
            document.location.href = comparison_link(
                curr_universe,
                [props.longname, x]);
        }}
    />
}

function StatisticRowHeader() {
    const [simple_ordinals, _] = useSetting("simple_ordinals");
    return <StatisticRowRaw _idx={-1} is_header={true} simple={simple_ordinals} />
}

function ArticlePanelRows(props) {
    const curr_universe = useUniverse();
    const settings = useTableCheckboxSettings();
    const [simple_ordinals, _set_simple_ordinals] = useSetting("simple_ordinals");
    const [filtered_rows, _] = load_article(curr_universe, props.article_row, settings,
        longname_is_exclusively_american(props.longname));
    return <>
        {filtered_rows.map((row, i) =>
            <StatisticRowRaw _idx={i} key={row.statname} index={i} {...row}
                onReplace={x => { document.location = article_link(curr_universe, x) }}
                simple={simple_ordinals}
                longname={props.longname}
            />)}
    </>
}