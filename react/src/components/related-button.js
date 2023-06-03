
import React from 'react';

export { Related };
import { article_link } from "../navigation/links.js";

import "./related.css";


class RelatedButton extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const classes = `button b_${this.props.row_type.toLowerCase()}`
        return (
            <li className="linklistel">
                <a
                    className={classes}
                    href={article_link(this.props.longname)}>{this.props.shortname}
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
        return (
            <ul className="linklist">
                <li className="linklistelfirst">{this.display_name()}</li>
                {this.props.regions.map((row, i) => <RelatedButton key={i} {...row} />)}
            </ul>
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

class Related extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {

        let elements = [];
        for (const [key, value] of Object.entries(this.props)) {
            console.log(key, value);
            if (value.length > 0) {
                elements.push(
                    <RelatedList key={key} name={key} regions={value} />
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