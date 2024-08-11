export { ArticlePanel };

import React from 'react';

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
import { longname_is_exclusively_american } from '../universe';
import { useSetting, useTableCheckboxSettings } from '../page_template/settings';

class ArticlePanel extends PageTemplate {
    constructor(props) {
        super(props);

        this.headers_ref = React.createRef();
        this.table_ref = React.createRef();
        this.map_ref = React.createRef();
    }

    main_content() {
        if (this.props.articleType == undefined) {
            throw new Error("articleType is undefined");
        }
        const self = this;

        return (
            <div>
                <div ref={this.headers_ref}>
                    <div className={headerTextClass()}>{this.props.shortname}</div>
                    <div className={subHeaderTextClass()}>{this.props.longname}</div>
                </div>
                <div style={{ marginBlockEnd: "16px" }}></div>

                <div className="stats_table" ref={this.table_ref}>
                    <StatisticRowHeader universe={this.state.current_universe} />
                    <ArticlePanelRows
                        current_universe={this.state.current_universe}
                        longname={this.props.longname}
                        article_row={this.props}
                    />
                </div>

                <p></p>

                <div ref={this.map_ref}>
                    <Map id="map"
                        longname={this.props.longname}
                        related={this.props.related}
                        article_type={this.props.articleType}
                        basemap={{ type: "osm" }}
                        universe={this.state.current_universe}
                    />
                </div>

                <div style={{ marginBlockEnd: "1em" }}></div>

                <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ width: "30%", marginRight: "1em" }}>
                        <div className="serif" style={comparisonHeadStyle("right")}>Compare to: </div>
                    </div>
                    <div style={{ width: "70%" }}>
                        <SearchBox
                            style={{ ...comparisonHeadStyle(), width: "100%" }}
                            placeholder={"Other region..."}
                            on_change={(x) => {
                                document.location.href = comparison_link(
                                    this.state.current_universe,
                                    [this.props.longname, x]);
                            }}
                        />
                    </div>
                </div>

                <script src="/scripts/map.js"></script>

                <Related
                    related={this.props.related}
                    article_type={this.props.articleType}
                    universe={this.state.current_universe}
                />
            </div>
        );
    }

    has_screenshot_button() {
        return true;
    }

    screencap_elements() {
        return {
            path: sanitize(this.props.longname) + ".png",
            overall_width: this.table_ref.current.offsetWidth * 2,
            elements_to_render: [this.headers_ref.current, this.table_ref.current, this.map_ref.current],
        }
    }

    has_universe_selector() {
        return true;
    }
}

function StatisticRowHeader(props) {
    const [simple_ordinals, _] = useSetting("simple_ordinals");
    return <StatisticRowRaw _idx={-1} is_header={true} simple={simple_ordinals} universe={props.universe}/>
}

function ArticlePanelRows(props) {
    const settings = useTableCheckboxSettings();
    const [simple_ordinals, _set_simple_ordinals] = useSetting("simple_ordinals");
    const [filtered_rows, _] = load_article(props.current_universe, props.article_row, settings,
        longname_is_exclusively_american(props.longname));
    return <>
        {filtered_rows.map((row, i) =>
            <StatisticRowRaw _idx={i} key={row.statname} index={i} {...row}
                onReplace={x => { document.location = article_link(props.current_universe, x) }}
                simple={simple_ordinals}
                longname={props.longname}
                universe={props.current_universe}
            />)}
    </>
}