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
import { Article } from "../utils/protos.js";

export function ArticlePanel({article}: { article: Article }) {
        const headers_ref = useRef();
        const table_ref = useRef();
        const map_ref = useRef();

        const responsive = useResponsive();

        const settings = useContext(Settings.Context);

        const [filtered_rows, _] = load_article(article, settings);

        const [simple_ordinals] = useSetting('simple_ordinals')

        const mainContent = (
            <div>
                <div ref={this.headers_ref}>
                    <div className={responsive.headerTextClass}>{article.shortname}</div>
                    <div className={responsive.subHeaderTextClass}>{article.longname}</div>
                </div>

                <div className="stats_table" ref={this.table_ref}>
                    <StatisticRowRaw _idx={-1} is_header={true} simple={simple_ordinals}/>
                    {filtered_rows.map((row, i) =>
                        <StatisticRowRaw _idx={i} key={row.statname} index={i} {...row} settings={this.state.settings}
                            onReplace={x => { document.location = article_link(x) }}
                            simple={this.state.settings.simple_ordinals}
                        />)}
                </div>

                <p></p>

                <div ref={this.map_ref}>
                    <Map id="map"
                        longname={this.props.longname}
                        related={this.props.related}
                        settings={this.state.settings}
                        article_type={this.props.article_type}
                        basemap={{ type: "osm" }} />
                </div>

                <div style={{ marginBlockEnd: "1em" }}></div>

                <div style={{ display: "flex" }}>
                    <div style={{ width: "30%", marginRight: "1em" }}>
                        <div style={responsive.comparisonHeadStyle("right")}>Compare to: </div>
                    </div>
                    <div style={{ width: "70%" }}>
                        <SearchBox
                            settings={this.state.settings}
                            style={{ ...responsive.comparisonHeadStyle(), width: "100%" }}
                            placeholder={"Other region..."}
                            on_change={(x) => {
                                document.location.href = comparison_link([this.props.longname, x]);
                            }}
                        />
                    </div>
                </div>

                <script src="/scripts/map.js"></script>

                <Related
                    related={this.props.related}
                    settings={this.state.settings}
                    set_setting={(key, value) => self.set_setting(key, value)}
                    article_type={this.props.article_type} />
            </div>
        );

    const screencapElements = {
        path: sanitize(this.props.longname) + ".png",
        overall_width: this.table_ref.current.offsetWidth * 2,
        elements_to_render: [this.headers_ref.current, this.table_ref.current, this.map_ref.current],
    }

    return <PageTemplate mainContent={mainContent} screencapElements={screencapElements} />
}

