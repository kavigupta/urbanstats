
import React from 'react';

import { article_link } from "../navigation/links";
import { is_historical_cd } from '../utils/is_historical';
import { CheckboxSetting } from "./sidebar";

import "./related.css";
import { useResponsive } from '../utils/responsive';
import { lighten } from '../utils/color';
import { useSetting } from "../page_template/settings";
import { NormalizeProto } from "../utils/types";
import { IRelatedButtons, IRelatedButton as RelatedButtonProto } from "../utils/protos";

type RelatedButtonModel = NormalizeProto<RelatedButtonProto>

export type RelationshipKey = `related__${string}__${string}`

const DARK_GRAY = "#4e525a";
const BLUE = "#5a7dc3";
const ORANGE = "#af6707";
const PURPLE = "#975ac3";
const RED = "#f96d6d";
const PINK = "#c767b0";
const GREEN = "#8ac35a";
const YELLOW = "#b8a32f";

const colorsEach: Record<string, string> = {
    "Country": DARK_GRAY,
    "Judicial Circuit": DARK_GRAY,
    "USDA County Type": DARK_GRAY,
    "State": BLUE,
    "Subnational Region": BLUE,
    "Native Area": BLUE,
    "CSA": ORANGE,
    "Native Statistical Area": ORANGE,
    "Judicial District": ORANGE,
    "Hospital Referral Region": ORANGE,
    "MSA": PURPLE,
    "Congressional District": PURPLE,
    "Historical Congressional District": PURPLE,
    "Native Subdivision": PURPLE,
    "Media Market": PURPLE,
    "Urban Area": PURPLE,
    "Hospital Service Area": PURPLE,
    "County": RED,
    "State Senate District": RED,
    "CCD": PINK,
    "State House District": PINK,
    "County Cross CD": PINK,
    "City": GREEN,
    "School District": GREEN,
    "Neighborhood": YELLOW,
    "ZIP": YELLOW,
}

export function relationship_key(article_type: string, other_type: string) {
    return `related__${article_type}__${other_type}` as const;
}

function RelatedButton(props: RelatedButtonModel) {

    const responsive = useResponsive()

    let classes = `serif button_related`
    if (responsive.mobileLayout) {
        classes += " button_related_mobile";
    }
    const color = colorsEach[props.rowType];
    if (color === undefined) {
        throw new Error("color is undefined; rowType is " + props.rowType);
    }
    return (
        <li className={"linklistel" + (responsive.mobileLayout ? " linklistel_mobile" : "")}>
            <a
                className={classes}
                style={{ color: "black", backgroundColor: lighten(color, 0.7)}}
                href={article_link(props.longname)}>{props.shortname}
            </a>
        </li>
    );
}

function RelatedList(props: { name: string, regions: RelatedButtonModel[], articleType: string }) {

    let byTypeKey: { type: string, regions: typeof props.regions }[] = [];
    for (let i = 0; i < props.regions.length; i++) {
        let row = props.regions[i];
        if (byTypeKey.length == 0 || byTypeKey[byTypeKey.length - 1].type != row.rowType) {
            byTypeKey.push({ type: row.rowType, regions: [] });
        }
        byTypeKey[byTypeKey.length - 1].regions.push(row);
    }
    const displayName = () => {
        let name = props.name;
        name = name.replace("_", " ");
        // title case
        name = name.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
        });
        return name;
    }
    const responsive = useResponsive()
    return (
        <div>
            <ul className="list_of_lists">
                <li className={"linklistelfirst" + (responsive.mobileLayout ? " linklistelfirst_mobile" : "")}>{displayName()}</li>
                {byTypeKey.map((row, i) =>
                    <CheckableRelatedList
                        key={i}
                        {...row}
                        article_type={props.articleType}
                    />)}
            </ul>
            <div className="gap_small"></div>
        </div>
    );
}

function CheckableRelatedList(props: { article_type: string, type: string, regions: RelatedButtonModel[] }) {
    let key = relationship_key(props.article_type, props.type);
    return (
        <li className="list_of_lists">
            <div style={{ display: "flex" }}>
                <div className="linkbox">
                    <CheckboxSetting
                        name=""
                        setting_key={key} />
                </div>
                <ul className="linklist">
                    {props.regions.map((row, i) => <RelatedButton key={i} {...row} />)}
                </ul>
            </div>
        </li>
    )
}

export function Related(props: { article_type: string, related: NormalizeProto<IRelatedButtons>[] }) {
    let elements = [];
    for (var relateds of props.related) {
        let key = relateds.relationshipType;
        let value = relateds.buttons;
        const [show_historical_cds] = useSetting('show_historical_cds')
        if (!show_historical_cds) {
            value = value.filter((row) => !is_historical_cd(row.longname));
        }
        if (value.length > 0) {
            elements.push(
                <RelatedList
                    key={key}
                    name={key}
                    regions={value}
                    articleType={props.article_type}
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