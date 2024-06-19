
import React from 'react';

export { Related, relationship_key };
import { article_link } from "../navigation/links.js";
import { is_historical_cd } from '../utils/is_historical.js';
import { CheckboxSetting } from "./sidebar.js";

import "./related.css";
import { mobileLayout } from '../utils/responsive.js';
import { lighten } from '../utils/color.js';

function relationship_key(article_type, other_type) {
    return "related__" + article_type + "__" + other_type;
}
function to_name(name) {
    return name.toLowerCase().replaceAll(" ", "_");
}

const type_to_type_category = require("../data/type_to_type_category.json");

class RelatedButton extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const RED = "#f96d6d";
        const BLUE = "#5a7dc3";
        const ORANGE = "#af6707";
        const PURPLE = "#975ac3";
        const DARK_GRAY = "#4e525a";
        const PINK = "#c767b0";
        const GREEN = "#8ac35a";
        const YELLOW = "#b8a32f";

        const type_category = type_to_type_category[this.props.rowType];

        const colors_each = {
            "International": RED,
            "US Subdivision": BLUE,
            "Census": ORANGE,
            "Political": PURPLE,
            "Oddball": DARK_GRAY,
            "Education": YELLOW,
            "Small": PINK,
            "Native": GREEN,
        };

        let classes = `serif button_related`
        if (mobileLayout()) {
            classes += " button_related_mobile";
        }
        const color = colors_each[type_category];
        if (color === undefined) {
            throw new Error("color is undefined; rowType is " + this.props.rowType);
        }
        return (
            <li className={"linklistel" + (mobileLayout() ? " linklistel_mobile" : "")}>
                <a
                    className={classes}
                    style={{ color: "black", backgroundColor: lighten(color, 0.7) }}
                    href={article_link(this.props.universe, this.props.longname)}>{this.props.shortname}
                </a>
            </li>
        );
    }
}

class RelatedList extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        let by_type_key = [];
        for (let i = 0; i < this.props.regions.length; i++) {
            let row = this.props.regions[i];
            if (by_type_key.length == 0 || by_type_key[by_type_key.length - 1].type != row.rowType) {
                by_type_key.push({ type: row.rowType, regions: [] });
            }
            by_type_key[by_type_key.length - 1].regions.push(row);
        }
        return (
            <div>
                <ul className="list_of_lists">
                    <li className={"linklistelfirst" + (mobileLayout() ? " linklistelfirst_mobile" : "")}>{this.display_name()}</li>
                    {by_type_key.map((row, i) =>
                        <CheckableRelatedList
                            key={i}
                            {...row}
                            article_type={this.props.article_type}
                            settings={this.props.settings}
                            set_setting={this.props.set_setting}
                            universe={this.props.universe}
                        />)}
                </ul>
                <div className="gap_small"></div>
            </div>
        );
    }

    display_name() {
        let name = this.props.name;
        name = name.replace("_", " ");
        // title case
        name = name.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
        return name;
    }
}

class CheckableRelatedList extends React.Component {
    render() {
        let key = this.key_for_setting();
        return (
            <li className="list_of_lists">
                <div style={{ display: "flex" }}>
                    <div className="linkbox">
                        <CheckboxSetting
                            name=""
                            setting_key={key}
                            settings={this.props.settings}
                            set_setting={this.props.set_setting} />
                    </div>
                    <ul className="linklist">
                        {this.props.regions.map((row, i) => <RelatedButton key={i} {...row} universe={this.props.universe} />)}
                    </ul>
                </div>
            </li>
        )
    }

    key_for_setting() {
        return relationship_key(this.props.article_type, this.props.type);
    }
}

class Related extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {

        let elements = [];
        for (var relateds of this.props.related) {
            let key = relateds.relationshipType;
            let value = relateds.buttons;
            if (!this.props.settings.show_historical_cds) {
                value = value.filter((row) => !is_historical_cd(row.longname));
            }
            if (value.length > 0) {
                elements.push(
                    <RelatedList
                        key={key}
                        name={key}
                        regions={value}
                        article_type={this.props.article_type}
                        settings={this.props.settings}
                        set_setting={this.props.set_setting}
                        universe={this.props.universe}
                    />
                );
            }
        }

        return (
            <div className="related_areas">
                {elements}
            </div>
        );
    }
}