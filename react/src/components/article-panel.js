export { ArticlePanel };

import React from 'react';

import { StatisticRowRaw } from "./table";
import { Map } from "./map";
import { Related } from "./related-button";
import { PageTemplateClass } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { load_article } from './load-article';
import { comparisonHeadStyle, headerTextClass, subHeaderTextClass } from '../utils/responsive';
import { SearchBox } from './search';
import { article_link, comparison_link, sanitize } from '../navigation/links';
import { longname_is_exclusively_american, useUniverse } from '../universe';
import { useSetting, useTableCheckboxSettings } from '../page_template/settings';

class ArticlePanel extends PageTemplateClass {
    constructor(props) {
        super(props);

        this.headers_ref = React.createRef();
        this.table_ref = React.createRef();
        this.map_ref = React.createRef();
    }

    main_content(template_info) {
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
                    <StatisticRowHeader />
                    <ArticlePanelRows
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
                    />
                </div>

                <div style={{ marginBlockEnd: "1em" }}></div>

                <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ width: "30%", marginRight: "1em" }}>
                        <div className="serif" style={comparisonHeadStyle("right")}>Compare to: </div>
                    </div>
                    <div style={{ width: "70%" }}>
                        <ComparisonSearchBox longname={this.props.longname} />
                    </div>
                </div>

                <script src="/scripts/map.js"></script>

                <Related
                    related={this.props.related}
                    article_type={this.props.articleType}
                />
            </div>
        );
    }

    screencap_elements() {
        return () => ({
            path: sanitize(this.props.longname) + ".png",
            overall_width: this.table_ref.current.offsetWidth * 2,
            elements_to_render: [this.headers_ref.current, this.table_ref.current, this.map_ref.current],
        })
    }

    has_universe_selector() {
        return true;
    }
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