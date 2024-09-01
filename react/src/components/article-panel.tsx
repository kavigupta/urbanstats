import React, { useRef } from 'react';

import { StatisticRowRaw } from "./table";
import { Map } from "./map";
import { Related } from "./related-button";
import { PageTemplate } from "../page_template/template";
import "../common.css";
import "./article.css";
import { load_article } from './load-article';
import { comparisonHeadStyle, headerTextClass, subHeaderTextClass } from '../utils/responsive';
import { SearchBox } from './search';
import { article_link, comparison_link, sanitize } from '../navigation/links';
import { longname_is_exclusively_american, useUniverse } from '../universe';
import { useSetting, useTableCheckboxSettings } from '../page_template/settings';
import { Article, IRelatedButtons } from "../utils/protos";
import { NormalizeProto } from "../utils/types";

export function ArticlePanel({ article } : { article: Article }) {

    const headers_ref = useRef<HTMLDivElement>(null);
    const table_ref = useRef<HTMLDivElement>(null);
    const map_ref = useRef<HTMLDivElement>(null);

    if (article.articleType == undefined) {
        throw new Error("articleType is undefined");
    }

    const screencap_elements = () => ({
        path: sanitize(article.longname) + ".png",
        overall_width: table_ref.current!.offsetWidth * 2,
        elements_to_render: [headers_ref.current!, table_ref.current!, map_ref.current!],
    })

        return <PageTemplate screencap_elements={screencap_elements} has_universe_selector={true} universes={article.universes}>{() =>
            <div>
                <div ref={headers_ref}>
                    <div className={headerTextClass()}>{article.shortname}</div>
                    <div className={subHeaderTextClass()}>{article.longname}</div>
                </div>
                <div style={{ marginBlockEnd: "16px" }}></div>

                <div className="stats_table" ref={table_ref}>
                    <StatisticRowHeader />
                    <ArticlePanelRows
                        longname={article.longname}
                        shortname={article.shortname}
                        article_row={article}
                    />
                </div>

                <p></p>

                <div ref={map_ref}>
                    <Map id="map"
                        longname={article.longname}
                        related={article.related as NormalizeProto<IRelatedButtons>[]}
                        article_type={article.articleType}
                        basemap={{ type: "osm" }}
                    />
                </div>

                <div style={{ marginBlockEnd: "1em" }}></div>

                <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ width: "30%", marginRight: "1em" }}>
                        <div className="serif" style={comparisonHeadStyle("right")}>Compare to: </div>
                    </div>
                    <div style={{ width: "70%" }}>
                        <ComparisonSearchBox longname={article.longname} />
                    </div>
                </div>

                <script src="/scripts/map.js"></script>

                <Related
                    related={article.related as NormalizeProto<IRelatedButtons>[]}
                    article_type={article.articleType}
                />
            </div>}
        </PageTemplate>
}

function ComparisonSearchBox({ longname }: { longname: string }) {
    const curr_universe = useUniverse();
    return <SearchBox
        style={{ ...comparisonHeadStyle(), width: "100%" }}
        placeholder={"Other region..."}
        on_change={(x) => {
            document.location.href = comparison_link(
                curr_universe,
                [longname, x]);
        }}
        autoFocus={false}
    />
}

function StatisticRowHeader() {
    const [simple_ordinals] = useSetting("simple_ordinals");
    return <StatisticRowRaw index={0} _idx={-1} is_header={true} simple={simple_ordinals} />
}

function ArticlePanelRows(props: { article_row: Article, longname: string, shortname: string }) {
    const curr_universe = useUniverse();
    const settings = useTableCheckboxSettings();
    const [simple_ordinals] = useSetting("simple_ordinals");
    const [filtered_rows] = load_article(curr_universe, props.article_row, settings,
        longname_is_exclusively_american(props.longname));
    return <>
        {filtered_rows.map((row, i) =>
            <StatisticRowRaw is_header={false} _idx={i} key={row.statname} index={i} {...row}
                onReplace={x => { document.location = article_link(curr_universe, x) }}
                simple={simple_ordinals}
                shortname={props.shortname}
            />)}
    </>
}