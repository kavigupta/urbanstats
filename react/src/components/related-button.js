
import React from 'react';

export { Related, relationship_key };
import { article_link } from "../navigation/links";
import { is_historical_cd } from '../utils/is_historical';
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

const type_ordering_idx = require("../data/type_ordering_idx.json");
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
            "School": YELLOW,
            "Small": PINK,
            "Native": GREEN,
        };

        let classes = `serif button_related`
        if (mobileLayout()) {
            classes += " button_related_mobile";
        }
        const color = colors_each[type_category];
        if (color === undefined) {
            throw new Error("color is undefined; rowType is " + this.props.rowType + " and type_category is " + type_category);
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

    key_for_setting() {
        return relationship_key(this.props.article_type, this.props.button_type);
    }


    render() {
        let setting_key = this.key_for_setting();
        return (
            <li className="list_of_lists">
                <div style={{ display: "flex" }}>
                    <div className="linkbox">
                        <div style={{ paddingTop: "2pt" }}>
                            <CheckboxSetting
                                name=""
                                setting_key={setting_key}
                                settings={this.props.settings}
                                set_setting={this.props.set_setting} />
                        </div>
                    </div>
                    <ul className="list_of_lists">
                        {
                            Object.keys(this.props.regions).map((relationship_type, j) => {
                                const regions = this.props.regions[relationship_type];
                                return (
                                    <ul key={j} className="linklist">
                                        <li
                                            className={"serif linklistel" + (mobileLayout() ? " linklistel_mobile" : "")}
                                            style={{ fontSize:
                                                mobileLayout() ? "12pt": "10pt"
                                                , paddingTop: "1pt", fontWeight: 500 }}
                                        >
                                            {this.display_name(relationship_type)}
                                        </li>
                                        {
                                            regions.map((row, i) =>
                                                <RelatedButton
                                                    key={i}
                                                    {...row}
                                                    article_type={this.props.article_type}
                                                    settings={this.props.settings}
                                                    set_setting={this.props.set_setting}
                                                    universe={this.props.universe}
                                                />
                                            )
                                        }
                                    </ul>
                                );
                            }
                            )
                        }
                    </ul>
                </div>
            </li>
        );
    }

    display_name(relationship_type) {
        relationship_type = relationship_type.replace("_", " ");
        // title case
        relationship_type = relationship_type.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
        return relationship_type;
    }
}

class Related extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        // buttons[rowType][relationshipType] = <list of buttons>
        let buttons = {};
        for (var relateds of this.props.related) {
            const relationship_type = relateds.relationshipType;
            for (var button of relateds.buttons) {
                const row_type = button.rowType;
                if (!(row_type in buttons)) {
                    buttons[row_type] = {};
                }
                if (!(relationship_type in buttons[row_type])) {
                    buttons[row_type][relationship_type] = [];
                }
                buttons[row_type][relationship_type].push(button);
            }
        }

        // get a sorted list of keys of buttons
        const button_keys = Object.keys(buttons).sort((a, b) =>
            type_ordering_idx[a] - type_ordering_idx[b]
        );

        let elements = [];
        for (var key of button_keys) {
            if (!this.props.settings.show_historical_cds) {
                if (key == "Historical Congressional District") {
                    continue;
                }
            }
            elements.push(
                <RelatedList
                    key={key}
                    button_type={key}
                    regions={buttons[key]}
                    article_type={this.props.article_type}
                    settings={this.props.settings}
                    set_setting={this.props.set_setting}
                    universe={this.props.universe}
                />
            );
        }

        return (
            <div className="related_areas">
                {elements}
            </div>
        );
    }
}