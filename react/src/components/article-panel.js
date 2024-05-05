export { ArticlePanel };

import React from 'react';

import { StatisticRowRaw } from "./table.js";
import { Map } from "./map.js";
import { Related } from "./related-button.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { load_article } from './load-article.js';
import { comparisonHeadStyle, headerTextClass, subHeaderTextClass } from '../utils/responsive.js';
import { SearchBox } from './search.js';
import { article_link, comparison_link, sanitize } from '../navigation/links.js';

class ArticlePanel extends PageTemplate {
    constructor(props) {
        super(props);

        this.headers_ref = React.createRef();
        this.table_ref = React.createRef();
        this.map_ref = React.createRef();
    }

    main_content() {
        const self = this;
        const [filtered_rows, _] = load_article(this.state.current_universe, this.props, this.state.settings);

        return (
            <div>
                <div ref={this.headers_ref}>
                    <div className={headerTextClass()}>{this.props.shortname}</div>
                    <div className={subHeaderTextClass()}>{this.props.longname}</div>
                </div>

                <div className="stats_table" ref={this.table_ref}>
                    <StatisticRowRaw _idx={-1} is_header={true} simple={this.state.settings.simple_ordinals} />
                    {filtered_rows.map((row, i) =>
                        <StatisticRowRaw _idx={i} key={row.statname} index={i} {...row} settings={this.state.settings}
                            onReplace={x => { document.location = article_link(self.state.current_universe, x) }}
                            simple={this.state.settings.simple_ordinals}
                            longname={this.props.longname}
                            universe={this.state.current_universe}
                        />)}
                </div>

                <p></p>

                <div ref={this.map_ref}>
                    <Map id="map"
                        longname={this.props.longname}
                        related={this.props.related}
                        settings={this.state.settings}
                        article_type={this.props.article_type}
                        basemap={{ type: "osm" }}
                        universe={this.state.current_universe}
                    />
                </div>

                <div style={{ marginBlockEnd: "1em" }}></div>

                <div style={{ display: "flex" }}>
                    <div style={{ width: "30%", marginRight: "1em" }}>
                        <div style={comparisonHeadStyle("right")}>Compare to: </div>
                    </div>
                    <div style={{ width: "70%" }}>
                        <SearchBox
                            settings={this.state.settings}
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
                    settings={this.state.settings}
                    set_setting={(key, value) => self.set_setting(key, value)}
                    article_type={this.props.article_type}
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

