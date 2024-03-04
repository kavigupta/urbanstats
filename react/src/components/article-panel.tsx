import React, { useContext, useRef } from 'react';

import { StatisticRowRaw } from "./table.js";
import { Map } from "./map.js";
import { Related } from "./related-button.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { load_article } from './load-article.js';
import { SearchBox } from './search.js';
import { article_link, comparison_link, sanitize } from '../navigation/links.js';
import { Settings, useSetting } from "../page_template/settings.js";
import { useResponsive } from "../utils/responsive.js";
import { Article, IRelatedButtons, RelatedButtons } from "../utils/protos.js";
import { NormalizeProto } from "../utils/types.js";

export function ArticlePanel({article}: { article: Article }) {
        const headers_ref = useRef(null);
        const table_ref = useRef<HTMLDivElement>(null);
        const map_ref = useRef(null);

        const responsive = useResponsive();

        const settings = useContext(Settings.Context);

        const [filtered_rows, _] = load_article(article, settings);

        const [simple_ordinals] = useSetting('simple_ordinals')

        const mainContent = (
            <div>
                <div ref={headers_ref}>
                    <div className={responsive.headerTextClass}>{article.shortname}</div>
                    <div className={responsive.subHeaderTextClass}>{article.longname}</div>
                </div>

                <div className="stats_table" ref={table_ref}>
                    <StatisticRowRaw _idx={-1} index={-1} is_header={true} simple={simple_ordinals}/>
                    {filtered_rows.map((row, i) =>
                        <StatisticRowRaw is_header={false} _idx={i} key={row.statname} index={i} row={row}
                            onReplace={x => { document.location = article_link(x) }}
                            simple={simple_ordinals}
                        />)}
                </div>

                <p></p>

                <div ref={map_ref}>
                    <Map id="map"
                        longname={article.longname}
                        related={article.related}
                        article_type={article.articleType}
                        basemap={{ type: "osm" }} />
                </div>

                <div style={{ marginBlockEnd: "1em" }}></div>

                <div style={{ display: "flex" }}>
                    <div style={{ width: "30%", marginRight: "1em" }}>
                        <div style={responsive.comparisonHeadStyle("right")}>Compare to: </div>
                    </div>
                    <div style={{ width: "70%" }}>
                        <SearchBox
                            style={{ ...responsive.comparisonHeadStyle(), width: "100%" }}
                            placeholder={"Other region..."}
                            on_change={(x) => {
                                document.location.href = comparison_link([article.longname, x]);
                            }}
                        />
                    </div>
                </div>

                <script src="/scripts/map.js"></script>

                <Related
                    related={article.related as NormalizeProto<IRelatedButtons>[]}
                    article_type={article.articleType} />
            </div>
        );

    const screencapElements = {
        path: sanitize(article.longname) + ".png",
        overall_width: table_ref.current!.offsetWidth * 2,
        elements_to_render: [headers_ref.current!, table_ref.current!, map_ref.current!],
    }

    return <PageTemplate mainContent={mainContent} screencapElements={screencapElements} />
}

