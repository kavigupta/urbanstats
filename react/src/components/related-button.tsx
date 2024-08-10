
import React from 'react';

import { article_link } from "../navigation/links";
import { CheckboxSetting } from "./sidebar";

import "./related.css";
import { mobileLayout } from '../utils/responsive';
import { lighten } from '../utils/color';
import { useSetting, relationship_key } from '../page_template/settings';


const type_ordering_idx = require("../data/type_ordering_idx.json");
const type_to_type_category = require("../data/type_to_type_category.json");


interface Region { rowType: string, longname: string, shortname: string }

const RED = "#f96d6d";
const BLUE = "#5a7dc3";
const ORANGE = "#af6707";
const PURPLE = "#975ac3";
const DARK_GRAY = "#4e525a";
const PINK = "#c767b0";
const GREEN = "#8ac35a";
const YELLOW = "#b8a32f";
const CYAN = "#07a5af";

const colorsEach: Record<string, string> = {
    "International": RED,
    "US Subdivision": BLUE,
    "Census": CYAN,
    "Political": PURPLE,
    "Oddball": DARK_GRAY,
    "Kavi": ORANGE,
    "School": YELLOW,
    "Small": PINK,
    "Native": GREEN,
};

type RowType = string;

function RelatedButton(props: { region: Region, universe: string }) {

    const type_category = type_to_type_category[props.region.rowType];

    let classes = `serif button_related`
    if (mobileLayout()) {
        classes += " button_related_mobile";
    }
    const color = colorsEach[type_category];
    if (color === undefined) {
        throw new Error("color is undefined; rowType is " + props.region.rowType + " and type_category is " + type_category);
    }
    return (
        <li className={"linklistel" + (mobileLayout() ? " linklistel_mobile" : "")}>
            <a
                className={classes}
                style={{ color: "black", backgroundColor: lighten(color, 0.7) }}
                href={article_link(props.universe, props.region.longname)}>{props.region.shortname}
            </a>
        </li>
    );
}

function RelatedList(props: { articleType: string, buttonType: string, regions: Record<string, any[]>, universe: string }) {
    if (props.articleType == undefined) {
        throw new Error("articleType is undefined; shoud be defined");
    }
    let setting_key = relationship_key(props.articleType, props.buttonType);
    function displayName(name: string) {
        name = name.replace("_", " ");
        // title case
        name = name.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
        });
        return name;
    }

    return (
        <li className="list_of_lists">
            <div style={{ display: "flex" }}>
                <div className="linkbox">
                    <div style={{ paddingTop: "2pt" }}>
                        <CheckboxSetting
                            name=""
                            setting_key={setting_key}
                            classNameToUse="related_checkbox"
                        />
                    </div>
                </div>
                <ul className="list_of_lists">
                    {
                        Object.keys(props.regions).map((relationship_type, j) => {
                            const regions = props.regions[relationship_type];
                            return (
                                <ul key={j} className="linklist">
                                    <li
                                        className={"serif linklistel" + (mobileLayout() ? " linklistel_mobile" : "")}
                                        style={{
                                            fontSize:
                                                mobileLayout() ? "12pt" : "10pt"
                                            , paddingTop: "1pt", fontWeight: 500
                                        }}
                                    >
                                        {displayName(relationship_type)}
                                    </li>
                                    {
                                        regions.map((row, i) =>
                                            <RelatedButton
                                                key={i}
                                                region={row}
                                                universe={props.universe}
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

export function Related(props: { article_type: string, related: { relationshipType: string, buttons: Region[] }[], universe: string }) {
    // buttons[rowType][relationshipType] = <list of buttons>
    const [showHistoricalCds, _] = useSetting("show_historical_cds");
    let buttons: Record<string, Record<string, Region[]>> = {};
    for (var relateds of props.related) {
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
        if (!showHistoricalCds) {
            if (key == "Historical Congressional District") {
                continue;
            }
        }
        elements.push(
            <RelatedList
                key={key}
                buttonType={key}
                regions={buttons[key]}
                articleType={props.article_type}
                universe={props.universe}
            />
        );
    }

    return (
        <div className="related_areas">
            {elements}
        </div>
    );
}